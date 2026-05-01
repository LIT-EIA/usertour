You are a senior software engineer implementing an iframe integration system for a user-onboarding tour SDK. Before writing a single line of code, you must complete three mandatory preparation steps.

---

## MANDATORY PREPARATION (Complete Before Any Implementation)

**Step 1 — Read project guidance files**

Check for and read the following files if they exist at the project root or conventional config locations:

- `claude.md`
- `agent.md`
- `skills.md`

Incorporate all conventions, patterns, utilities, and constraints found in those files into every decision you make during this implementation. If a file is absent, proceed without it.

**Step 2 — Analyze the target codebase architecture**

Before writing code, read and understand:
- The tour/onboarding engine: how steps are defined, displayed, and progressed
- The element-finding subsystem: how CSS selectors are resolved to DOM elements
- The store/state management layer: how tour state is propagated to UI components
- The event system: how internal events are emitted and consumed
- The existing utility structure: what patterns are used for singletons, cleanup, and async flows

**Step 3 — Map abstract concepts to concrete locations**

For each system component defined below, identify its exact counterpart in the target codebase before implementing. Write down:
- Which existing file the component should live in or extend
- Which existing classes or functions it depends on
- Which existing interfaces or types it should conform to or extend

Only after completing all three steps should you begin writing code.

---

## Objective

Implement a complete iframe integration layer that allows the tour SDK to:

1. Automatically detect and locate tour target elements inside iframes when they are not found in the main document
2. Position tour UI accurately relative to elements inside iframes using viewport-space virtual elements
3. Communicate bidirectionally between the parent page and iframes using `postMessage`
4. Bridge step lifecycle events (complete, action, navigation) across frame boundaries
5. Keep tour UI position synchronized as the user scrolls the main page or the iframe
6. Clean up all event listeners, virtual DOM nodes, and message handlers when steps end or the tour closes

---

## System Architecture

### Component 1 — IframeUtils (Singleton)

**Responsibility:** All low-level iframe operations. Acts as the communication bus between the parent window and embedded frames.

**Key responsibilities:**
- Enumerate all `<iframe>` elements in the document
- Determine whether an iframe is same-origin (accessible) or cross-origin
- Check CSS visibility of an iframe and its ancestor chain (display, visibility, opacity, dimensions)
- Search for a target element across all visible, accessible iframes using an optimized search that starts from the last successful context (cached index, −1 = main document, ≥0 = iframe index)
- Inject a self-contained inline SDK script into same-origin iframes
- Send typed `postMessage` messages to a specific iframe
- Broadcast cleanup messages to all iframes
- Manage a registry of named `IframeCommunicationHandler` objects; register/deregister them by string ID
- Install exactly one `window.addEventListener('message', …)` listener shared across all handlers; remove it when the registry is empty

**Invariants:**
- Must be a singleton
- The `message` listener must be installed only once regardless of how many handlers are registered
- The search context cache (`lastSearchContext`) must be reset to −1 whenever an element is found in the main document
- Must silently ignore messages that do not start with the system namespace prefix
- Must filter incoming messages to those not originating from `window` itself (only iframe → parent direction is valid here)

---

### Component 2 — Injected Iframe SDK (Inline Script Object)

**Responsibility:** A self-contained JavaScript object (`window.<namespace>IframeSDK`) that is serialized as a string and injected as a `<script>` tag into same-origin iframes. It must not depend on any bundled module.

**Key responsibilities:**
- Initialize exactly once per iframe; guard against re-initialization
- Register a `message` listener that accepts only messages from `window.parent`
- Respond to `find-element` commands: locate the element, set up interaction listeners, notify the parent
- Respond to `cleanup-step` and `cleanup-all-steps` commands: remove all installed event listeners
- Respond to `step-action` commands: delegate to internal action handlers (complete, next, previous, skip)
- Notify the parent when initialization is complete (`iframe-ready` message)

**Element interaction setup:**
- Install document-level `mousedown` and `click` listeners in **capture phase** so they fire before any link's `preventDefault` or `stopPropagation`
- Match the clicked element against the target using: direct identity, `contains()`, selector matching (for elements that call `preventDefault`), and reverse-contains
- Deduplicate: use a boolean flag with a short reset timeout to suppress duplicate events from the same physical click
- When a click matches, send either a `step-action` message (if specific actions are defined) or a `step-complete` message (default)
- Store all installed handlers as expando properties on the element for later cleanup

**Trigger monitoring (condition polling):**
- When the `find-element` message includes triggers, poll each trigger's conditions every 500 ms
- Supported condition types: `current-page` (URL pattern matching), `time` (date/time range), `element` (present/unpresent/disabled/clicked), `text-input` (value comparisons), `text-fill` (debounced fill detection), `group` (AND/OR composite)
- When a trigger fires, wait the configured `wait` duration (capped at 300 s) then execute actions
- If no triggers exist, set up the click handler immediately

**Selector resolution (inline, no imports):**
- Support `customSelector` (CSS string), `selectors` array (try each in order), `selectorsList` array (try each in order)
- Support the conditional pattern `<<< ` as a separator between the main selector and a guard selector
- Support `content` text matching (exact/contains) against innerText, textContent, and ARIA attributes (title, aria-label, aria-labelledby, name, alt)
- Support `sequence` to pick the nth matching element (1st–5th)

**Cleanup:**
- `cleanupStep(stepId)`: iterate all elements with the matching step ID expando, remove document-level listeners, delete expando properties, stop trigger monitors
- `cleanupAllSteps()`: same but for all tracked elements and all monitors

---

### Component 3 — ElementWatcher (Enhanced)

**Responsibility:** Watches for a target element to appear in the DOM, whether in the main document or inside an iframe.

**Search algorithm:**
1. Abort immediately if `hasFoundElement` flag is set
2. Check document readiness; retry if not ready
3. Evaluate conditional selector (`<<<`) if present; retry if not satisfied
4. Search the main document; if found, fire `ELEMENT_FOUND`, reset cache
5. If not in main document, search iframes via `IframeUtils.searchElementInIframes`
6. If found in iframe, validate iframe CSS-visibility before firing `ELEMENT_FOUND`
7. If not found anywhere, schedule retry after `RETRY_DELAY` ms

**Throttling / progressive search:**
- First 3 retries: no throttle between iframe searches
- Thereafter: use adaptive interval (300 ms if any iframe is still loading; 500 ms otherwise)
- After each failed iframe search, set a disabled flag that auto-clears after the interval

**Iframe src-change monitoring:**
- Use a `MutationObserver` on `document.body` watching `childList`, `subtree`, and `src` attribute changes
- Track each `<iframe>`'s `src` in a `Map`; detect changes and trigger a re-search after 500 ms
- Back up with a 1 s polling interval
- Stop monitoring when `hasFoundElement` is true

**State:**
- `element`: the found DOM element
- `iframeElementInfo`: metadata about the iframe context (element, iframe element, src, index, rect)
- `hasFoundElement`: one-way latch preventing duplicate `ELEMENT_FOUND` emissions
- `isSearchingIframes`: prevents concurrent iframe searches

**Reset / Destroy:**
- `reset()`: clear all state, stop monitoring, re-parse the selector
- `destroy()`: call `reset()` and disconnect observers

---

### Component 4 — Tour (Extended)

**Responsibility:** Coordinates the full step lifecycle including iframe-specific flows.

**When the element is found in an iframe:**
1. Check iframe CSS-visibility; if hidden, reset the watcher and retry
2. Call `createVirtualElementForIframe()` to produce a positioned proxy DOM node
3. Call `setupIframeCommunication(step, iframeElementInfo)` to install the message handler and send the `find-element` command to the iframe
4. Execute a two-phase scroll: (a) scroll the main page to bring the iframe into view, (b) scroll inside the iframe to bring the target element into view; wait for both to settle
5. Recreate the virtual element after step (a) because the iframe's viewport coordinates have changed
6. After scroll settles, call `updateIframeElementPosition()` to synchronize the virtual element
7. Call `setupIframePositionUpdate()` to keep the virtual element synchronized during future scroll/resize events
8. Update the store with the final `triggerRef` (virtual element), `iframeElementInfo`, and step metadata
9. Activate trigger conditions only after the element is fully stabilized

**Virtual element:**
- A `<div>` appended to `document.body` with `position: fixed`, sized and positioned to match the target element's coordinates in the main viewport
- `pointer-events: none`, `visibility: hidden`
- Tagged with expando properties for identification and cleanup
- Coordinate formula: `iframeRect.left + elementRect.left`, `iframeRect.top + elementRect.top`

**Position update loop (`setupIframePositionUpdate`):**
- Install `scroll` and `resize` listeners on `window` and on the iframe's `contentWindow`
- On each event, start a `requestAnimationFrame` loop that continuously calls `updateIframeElementPosition`
- The loop stops 100 ms after the last scroll event; restart on next event
- Store a single `cleanupIframePositionUpdate` function that cancels the RAF loop, clears timeouts, and removes all listeners

**Iframe communication setup:**
- Register a named handler `tour-step-<stepId>` in `IframeUtils`
- After SDK injection, wait 200 ms, then send `find-element` message
- Retry the `find-element` message with exponential backoff (300 ms × (retryCount + 1), capped at 2 s), up to 8 retries
- Cancel all pending retries when: the step changes, the iframe becomes hidden, the iframe SDK sends `element-setup-complete`, or `cancelIframeRetries()` is called
- Circuit breaker: stop retries after 3 consecutive errors (not element-not-found; those are normal during loads)
- Syntax errors in the selector must terminate retries immediately (they will not self-resolve)

**Step completion from iframe:**
- `handleIframeStepComplete`: report step events, then call `moveToNextStep()`
- `handleIframeStepAction`: if action is `handleActions`, delegate to the existing `handleActions(actions)` method; otherwise look up the matching action on the step target

**Cleanup:**
- Before destroying the element watcher, send `cleanup-step` to the iframe if the element was in one
- `cleanupIframeCommunication(step)`: remove handler from registry
- `cleanupIframePositionUpdate()`: remove all scroll/resize listeners, cancel RAF loop
- `close()` and `reset()` must both trigger full iframe cleanup

---

## Data Contracts

### Message Envelope

All messages crossing frame boundaries must carry a `type` field prefixed with the system namespace (e.g., `usertour-`). Unknown types are silently ignored.

### Parent → Iframe Messages

```
find-element {
  type: '<ns>-find-element'
  element: ElementSelectorPropsData   // selector object
  stepId: string
  actions?: RulesCondition[]          // click actions to delegate back
  triggers?: StepTrigger[]            // conditions to poll in iframe
}

cleanup-step {
  type: '<ns>-cleanup-step'
  stepId: string
}

cleanup-all-steps {
  type: '<ns>-cleanup-all-steps'
}

step-action (parent → iframe) {
  type: '<ns>-step-action'
  stepId: string
  action: 'complete' | 'next' | 'previous' | 'skip'
  data?: any
}
```

### Iframe → Parent Messages

```
iframe-ready {
  type: '<ns>-iframe-ready'
}

element-found {
  type: '<ns>-element-found'
  element: {
    selector: ElementSelectorPropsData
    iframeSrc: string
    iframeIndex: number
  }
}

element-not-found {
  type: '<ns>-element-not-found'
  element: {
    selector: ElementSelectorPropsData
    iframeSrc: string
    iframeIndex: number
  }
}

step-complete {
  type: '<ns>-step-complete'
  stepId: string
  data?: any
}

step-action (iframe → parent) {
  type: '<ns>-step-action'
  stepId: string
  action: string       // 'next' | 'previous' | 'skip' | 'handleActions' | ...
  data?: any           // for 'handleActions': { actions: RulesCondition[] }
}

element-setup-complete {
  type: '<ns>-element-setup-complete'
  stepId: string
}
```

### IframeElementInfo

```
{
  element: Element              // the found element within the iframe document
  iframe: HTMLIFrameElement     // the iframe element in the parent document
  iframeSrc: string             // iframe.src at time of discovery
  iframeIndex: number           // position in getAllIframes() result
  iframeRect: DOMRect           // getBoundingClientRect() at time of discovery (mutable)
}
```

### IframeCommunicationHandler

```
{
  onStepComplete(stepId, data?): void
  onStepAction(stepId, action, data?): void
  onElementFound(info: IframeElementInfo): void
  onElementNotFound(selector): void
  onElementSetupComplete?(stepId): void
}
```

---

## Phased Implementation Plan

### Phase 1 — Core Utilities

1. Implement `IframeUtils` singleton with:
   - `getAllIframes()`, `isIframeAccessible()`, `isIframeCSSVisible()`
   - `isElementInHiddenSection()` / `isElementInHiddenSectionInIframe()`
   - `searchElementInIframes()` with last-context cache
   - `sendMessageToIframe()`, `sendCleanupMessageToIframe()`, `sendCleanupAllStepsToAllIframes()`
   - Handler registry: `setCommunicationHandler()`, `removeCommunicationHandler()`, `removeAllCommunicationHandlers()`
   - Shared `message` event listener with routing logic
   - `waitForIframeLoad()` with load event + polling + DOMContentLoaded + timeout
   - `injectSDKIntoIframe()` with idempotency check

2. Implement `parseSelectorWithCondition()` — pure function, no side effects, handles `<<<` pattern in `customSelector` and `selectorsList`

### Phase 2 — Injected SDK

3. Implement the inline SDK object string returned by `getIframeSDKCode()`. It must be entirely self-contained (no imports, no closures over external variables). Include:
   - Initialization guard, `message` listener installation, `iframe-ready` notification
   - `handleFindElement`: element location, visibility check, interaction or trigger setup, element-not-found fallback
   - `setupElementInteraction`: document-level capture-phase listeners, deduplication, selector-matching fallback
   - `setupTriggerMonitoring` + `evaluateCondition` + `evaluateTriggerConditions`: full condition evaluation loop
   - `findElementBySelectorData`: content matching, sequence, ARIA attribute fallback
   - `cleanupStep` + `cleanupAllSteps`
   - `isElementInHiddenSection` (duplicate of parent-side logic, must work standalone)

### Phase 3 — ElementWatcher Enhancement

4. Extend `ElementWatcher` with:
   - `iframeElementInfo` state field
   - `hasFoundElement` one-way latch with guards on every code path
   - Adaptive throttling in the search loop
   - `searchInIframes()` with concurrency guard
   - `startIframeMonitoring()` / `stopIframeMonitoring()` with `MutationObserver` + polling fallback
   - `reset()` / `destroy()` cleaning up all iframe state

### Phase 4 — Tour Lifecycle Integration

5. Extend `Tour` with:
   - `createVirtualElementForIframe()` with fixed positioning and expando tagging
   - `updateIframeElementPosition()` with null-safety and connectivity checks
   - `setupIframePositionUpdate()` with RAF loop, dual scroll listeners (main + iframe), and cleanup function
   - `cleanupIframePositionUpdate()`
   - `setupIframeCommunication()` with SDK injection, message sending, retry logic, circuit breaker, and cancel-on-step-change
   - `handleIframeStepComplete()` / `handleIframeStepAction()`
   - `cancelIframeRetries()` and `iframeSDKConfirmedSteps` Set
   - Two-phase scroll logic in `handleElementFound()` for iframe elements
   - Full cleanup wiring into `close()`, `reset()`, and `setupElementWatcher()`

### Phase 5 — Hardening

6. Audit all async paths for race conditions (step change mid-scroll, iframe unload mid-message, double `handleElementFound` call)
7. Verify all `postMessage` calls use `'*'` as the target origin when sending to iframes and validate source before processing incoming messages
8. Confirm all `requestAnimationFrame`, `setInterval`, and `setTimeout` handles are stored and cancelled on cleanup
9. Confirm `MutationObserver` is disconnected on destroy
10. Test with: elements in visible iframes, elements in hidden iframes, iframes that change `src` mid-tour, same-origin iframes, tours that navigate across multiple steps each in different iframes

---

## Edge Case Handling

### Delayed iframe readiness
**Problem:** The iframe's `readyState` may briefly appear `complete` while new content is still loading after a `src` change.
**Solution:** Double-check readiness with two consecutive polling cycles before resolving `waitForIframeLoad`. Use a 300 ms stabilization delay after the `load` event fires.

### Element found in a hidden iframe
**Problem:** `searchElementInIframes` may find an element in an iframe that is CSS-hidden (tab panel not active, modal closed, etc.).
**Solution:** Check `isIframeCSSVisible()` before emitting `ELEMENT_FOUND`. If hidden, schedule a retry; do not latch `hasFoundElement`.

### Race: step changes during iframe message retry
**Problem:** Exponential-backoff retries may fire after the tour has moved to a different step.
**Solution:** Check `getCurrentStep()?.cvid !== step.cvid` at every retry entry point. If mismatched, abort and do not send the message.

### Race: double `handleElementFound`
**Problem:** The `once` listener on `ELEMENT_FOUND` may still allow duplicate processing if events fire in rapid succession.
**Solution:** Maintain an `isProcessingElementFound` boolean flag; return immediately at entry if true; clear after processing completes.

### Virtual element position stale after scroll
**Problem:** The virtual element's `fixed` coordinates were calculated before the user scrolled; they no longer align with the target after scrolling.
**Solution:** Run a `requestAnimationFrame` loop during scroll events that continuously recalculates coordinates from `iframe.getBoundingClientRect()` + `element.getBoundingClientRect()`. Stop 100 ms after the last scroll event.

### Iframe scrolled internally (element above iframe center)
**Problem:** Scrolling the main page to center the iframe in the viewport may not bring the target element into view if it is in the upper portion of the iframe.
**Solution:** Check whether the element's `top` relative to the iframe is above the iframe's vertical midpoint. If so, scroll the main page to align the element directly with the viewport center instead of scrolling the iframe. Then scroll the element inside the iframe as a second pass.

### Virtual element coordinates after two-phase scroll
**Problem:** Phase 1 scroll changes `iframeRect`; the virtual element created before scrolling now has wrong coordinates.
**Solution:** After phase 1 completes, recalculate `iframeRect` via `getBoundingClientRect()`, destroy the old virtual element, and recreate it. Then perform phase 2 scroll. Then update position one final time before updating the store.

### `src` change mid-tour
**Problem:** The iframe may navigate to a new page while a tour step is in progress, unloading the injected SDK.
**Solution:** The `MutationObserver` in `ElementWatcher` detects `src` attribute changes and resets the search state, forcing a full re-search with a 500 ms lead time for the iframe to begin loading.

### Element matching `preventDefault` on links
**Problem:** A `click` event on an `<a>` tag that calls `preventDefault` will not navigate, and the target element may be inside or closely related to the link. Standard `element.addEventListener('click', …)` may not fire in the expected order.
**Solution:** Listen at `document` level in capture phase for both `mousedown` and `click`. Match against the target using: direct identity, `element.contains(target)`, `target.matches(selector)`, `target.contains(element)`, and ancestor traversal (up to 10 levels). Use `hasHandled` deduplication.

### Cross-origin iframes
**Problem:** Cross-origin iframes block all DOM access; `contentDocument` throws a security error.
**Solution:** Wrap all `contentDocument` access in `try/catch`; treat throws as inaccessible. Cross-origin iframes cannot have the SDK injected; they can only participate if they independently include a compatible SDK build and send messages. `isIframeAccessible()` must return `false` for them without throwing.

### Nested iframes
**Problem:** An iframe may contain a nested iframe.
**Solution:** The current architecture searches only one level deep. Mark nested iframe support as explicitly out of scope. Do not attempt to recurse into `contentDocument`-hosted iframes.

### Message from unrelated `postMessage` senders
**Problem:** Any page can post arbitrary messages; processing them could cause errors.
**Solution:** The parent listener checks `event.source !== window` (not from self). The iframe listener checks `event.source === window.parent`. Both check that `message.type` starts with the system namespace prefix. Wrap processing in `try/catch`.

### SDK re-injection after iframe reload
**Problem:** After `src` changes, the iframe's DOM is reset; the previously injected `<script>` tag is gone.
**Solution:** `injectSDKIntoIframe()` checks for `script[data-<namespace>-sdk]` before injecting. After a `src` change is detected, the watcher triggers a fresh `setupIframeCommunication()` call which will re-inject because the old script tag no longer exists.

### Stale `iframeRect` in position updates
**Problem:** `iframeElementInfo.iframeRect` is captured at element-discovery time; it becomes wrong as the page layout changes.
**Solution:** `updateIframeElementPosition()` always calls `iframe.getBoundingClientRect()` live and updates `iframeElementInfo.iframeRect` in place after each calculation.

### Memory leaks from orphaned virtual elements
**Problem:** If the tour crashes or is force-closed, virtual elements appended to `document.body` may remain.
**Solution:** Tag every virtual element with `__<namespace>_virtual_iframe = true`. The cleanup path in `close()` and `reset()` must query `document.body` for tagged elements and remove them.

### RAF loop running after tour close
**Problem:** The animation frame loop in `setupIframePositionUpdate` captures a closure and may outlive the tour.
**Solution:** The `cleanupIframePositionUpdate` function sets `isRunning = false` and calls `cancelAnimationFrame(rafId)`. It must be called from both `cleanupIframeCommunication()` and the top of `setupIframePositionUpdate()` before starting a new loop.

---

## Constraints

- The injected SDK string must be self-contained; it cannot reference variables from the enclosing closure or import any module
- All `postMessage` calls to iframes must use `'*'` as the target origin (iframes may be same-origin or cross-origin)
- Incoming `message` events must be filtered by source before processing
- All async operations must be guarded against step mismatch; stale callbacks from a previous step must be silently discarded
- The `IframeUtils` singleton's message listener must be shared; never register multiple listeners for the same event
- Virtual elements must never intercept pointer events (`pointer-events: none`)
- Virtual elements must not be visible to users (`visibility: hidden`)
- RAF loops must be stopped before starting a new one for the same iframe context
- Cleanup functions must be idempotent (safe to call multiple times)
- The implementation must follow all conventions found in `claude.md`, `agent.md`, and `skills.md`
- Do not add console logging beyond what is required by any logging conventions found in the guidance files; the existing implementation has verbose debug logging that should be reviewed against the project's standards before adoption
