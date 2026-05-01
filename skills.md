# Skills — Reusable Utilities in This Codebase

Before implementing anything, check this file. If a utility already exists for
what you need, use it — do not reimplement it.

---

## Element Discovery

### `finderV2(selector, document)`
**Location:** `@usertour-packages/finder` (`packages/shared/finder/src/finderx.ts`)
**Use for:** Resolving an `ElementSelectorPropsData` object to a DOM `Element`.
Handles `customSelector`, `selectors[]`, `selectorsList[]`, content matching, and sequence.

```typescript
import { finderV2 } from '@usertour-packages/finder';
const el = finderV2(selectorData, document);                 // main document
const el = finderV2(selectorData, iframe.contentDocument);   // iframe document
```

### `parseSelectorWithCondition(selector)`
**Location:** `apps/sdk/src/utils/selector-parser.ts`
**Use for:** Splitting a selector that contains the `<<<` conditional pattern into
`{ mainSelector, conditionalSelector }`.

```typescript
import { parseSelectorWithCondition } from './selector-parser';
const { mainSelector, conditionalSelector } = parseSelectorWithCondition(target);
```

### `checkConditionalSelectorPresent(conditionalSelector)`
**Location:** `apps/sdk/src/utils/selector-parser.ts`
**Use for:** Checking whether the guard element in a `<<<` conditional selector is
visible (searches main document and iframes). Returns `Promise<boolean>`.

---

## DOM Utilities

### `isVisibleNode(element)`
**Location:** `@usertour-packages/dom`
**Use for:** Checking if a DOM element is visible (non-zero dimensions, not hidden).

### `smoothScroll(element, options)`
**Location:** `@usertour-packages/dom`
**Use for:** Scrolling an element into view and waiting for the animation to settle.
Returns a Promise.

```typescript
import { smoothScroll } from '@usertour-packages/dom';
await smoothScroll(element, { block: 'center' });
```

---

## Iframe Utilities

### `iframeUtils` (singleton)
**Location:** `apps/sdk/src/utils/iframe-utils.ts`
**Use for:** All iframe operations from the parent window.

```typescript
import { iframeUtils } from './iframe-utils';

// Search for an element across all accessible iframes
const info = await iframeUtils.searchElementInIframes(selectorData);

// Send a postMessage to a specific iframe
iframeUtils.sendMessageToIframe(iframe, { type: 'usertour-find-element', ... });

// Register a named communication handler
iframeUtils.setCommunicationHandler('tour-step-xyz', {
  onStepComplete: (stepId, data) => { ... },
  onStepAction: (stepId, action, data) => { ... },
  onElementFound: (info) => { ... },
  onElementNotFound: (selector) => { ... },
  onElementSetupComplete: (stepId) => { ... },
});

// Remove handler when step ends
iframeUtils.removeCommunicationHandler('tour-step-xyz');

// Inject the SDK into a same-origin iframe
await iframeUtils.injectSDKIntoIframe(iframe);

// Broadcast cleanup to all iframes
iframeUtils.sendCleanupAllStepsToAllIframes();

// Visibility checks
iframeUtils.isIframeAccessible(iframe);   // same-origin DOM access check
iframeUtils.isIframeCSSVisible(iframe);   // display/visibility/opacity/dimensions check
iframeUtils.isIframeVisible(iframe);      // viewport intersection check

// Coordinate conversion
iframeUtils.convertIframeToParentCoordinates(elementRect, iframeRect);

// Reset search context cache (call when element found in main document)
iframeUtils.resetSearchContext();
```

Key types exported from `iframe-utils.ts`:
```typescript
import {
  IframeElementInfo,
  IframeCommunicationHandler,
  IframeMessage,
} from './iframe-utils';
```

---

## Condition / Trigger Evaluation

### `activedRulesConditions(conditions, context)`
**Location:** `apps/sdk/src/utils/conditions.ts`
**Use for:** Evaluating an array of `RulesCondition` objects against the current
page/user state. Returns a boolean.

### `isActive(content, context)`
**Location:** `apps/sdk/src/utils/conditions.ts`
**Use for:** Checking whether a piece of content should be active given current
conditions.

### `isVisible(element)`
**Location:** `apps/sdk/src/utils/conditions.ts`
**Use for:** Async visibility check for a DOM element including scroll-area checks.
Returns `Promise<boolean>`.

---

## Event System

### `Evented`
**Location:** `apps/sdk/src/core/evented.ts`
**Use for:** Adding `.on()`, `.once()`, `.off()`, `.trigger()` to a class.

```typescript
import { Evented } from './evented';
class MyClass extends Evented { ... }
instance.on('my-event', handler);
instance.trigger('my-event', payload);
```

### `AppEvents`
**Location:** `apps/sdk/src/utils/event.ts`
**Use for:** Event name constants. Extend this enum when adding new SDK-internal events.

```typescript
import { AppEvents } from '../utils/event';
// AppEvents.ELEMENT_FOUND
// AppEvents.ELEMENT_FOUND_TIMEOUT
// AppEvents.ELEMENT_CHANGED
// AppEvents.CONTENT_STARTED
```

---

## Logging

### `logger`
**Location:** `apps/sdk/src/utils/logger.ts`
**Use for:** All diagnostic output. Silent unless `localStorage.debug` is set.

```typescript
import { logger } from './logger';
logger.info('Starting element search', { selector });
logger.warn('Element not found after retries');
logger.error('postMessage failed', error);
logger.critical('Unrecoverable state');  // always logs regardless of debug flag
```

---

## Safe Browser Globals

### `window`, `document`, `navigator`, `location`, `fetch`
**Location:** `apps/sdk/src/utils/globals.ts`
**Use for:** All browser global access in SDK code. Returns `undefined` in
non-browser contexts (SSR, Web Workers).

```typescript
import { window, document } from './globals';
if (!document?.body) return;
window?.addEventListener('scroll', handler);
```

---

## Store / State

### `ExternalStore<T>`
**Location:** `apps/sdk/src/core/store.ts`
**Use for:** React-compatible external store (useSyncExternalStore). Managed by
`BaseContent` — access via `this.getStore()`, `this.setStore()`, `this.updateStore()`.

Store shape types live in `apps/sdk/src/types/store.ts`:
- `BaseStore` — fields common to all content types
- `TourStore` — extends `BaseStore` with `currentStep`, `triggerRef`, `iframeElementInfo`
- `ChecklistStore` — extends `BaseStore` with checklist-specific fields
- `LauncherStore` — extends `BaseStore` with launcher-specific fields

---

## Content Lifecycle

### `BaseContent<T>`
**Location:** `apps/sdk/src/core/base-content.ts`
**Use for:** Base class for all tour/checklist/launcher content. Provides:
- `getContent()`, `getStore()`, `setStore()`, `updateStore()`
- `getCurrentStep()`, `setCurrentStep()`
- `getUserInfo()`, `getTargetMissingSeconds()`, `getBaseZIndex()`
- `reportEventWithSession()`, `reportStepEvents()`
- `handleActions(actions)` — executes a `RulesCondition[]` action array
- `close(reason)`, `reset()`, `destroy()`, `isActiveTour()`

### `ElementWatcher`
**Location:** `apps/sdk/src/core/element-watcher.ts`
**Use for:** Watching for a DOM element to appear, including inside iframes.
Searches main document first, then all accessible iframes with adaptive throttling.

```typescript
import { ElementWatcher } from './element-watcher';

const watcher = new ElementWatcher(step.target);
watcher.setTargetMissingSeconds(seconds);
watcher.once(AppEvents.ELEMENT_FOUND, (el) => { ... });
watcher.once(AppEvents.ELEMENT_FOUND_TIMEOUT, () => { ... });
await watcher.findElement();

// After ELEMENT_FOUND fires, check if the element was in an iframe:
const iframeInfo = watcher.getIframeElementInfo();  // null if main document
const inIframe = watcher.isElementInIframe();

// Reset state (e.g., after SPA navigation) without destroying:
watcher.reset();

// Full teardown:
watcher.destroy();
```

---

## Navigation Utilities

### `buildNavigateUrl(url, params)`
**Location:** `apps/sdk/src/utils/navigate-utils.ts`
**Use for:** Building URLs for `PAGE_NAVIGATE` actions.

---

## Helpers (`@usertour/helpers`)

| Function | Purpose |
|----------|---------|
| `uuidV4()` | Generate a UUID |
| `evalCode(code, context)` | Safely evaluate JS code (JAVASCRIPT_EVALUATE action) |
| `convertSettings(settings)` | Convert theme settings object |
| `convertToCssVars(obj)` | Convert settings object to CSS custom properties string |
| `isUndefined(val)` | Type-safe undefined check |

---

## Content Utilities

### `getStepByCvid(steps, cvid)`
**Location:** `apps/sdk/src/utils/content-utils.ts`
**Use for:** Finding a step by its `cvid` field in a steps array.

### `getActivedTheme(content)`
**Location:** `apps/sdk/src/utils/content-utils.ts`
**Use for:** Resolving the active theme for a content definition.
