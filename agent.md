# Agent Guidelines — Usertour

This file describes how AI agents should approach tasks in this repository.

---

## Mandatory First Steps (Every Task)

Before writing any code:

1. Read `claude.md` — coding standards, toolchain, formatting rules, architectural patterns
2. Read `skills.md` — reusable utilities and helpers already available in the codebase
3. Read the files most relevant to the task (see "Navigation" below)
4. Identify exactly which existing files will be modified or extended

Do not create new files unless an existing file cannot reasonably absorb the change.

---

## Navigation

### SDK Core (`apps/sdk/src/`)

| Path | What it contains |
|------|-----------------|
| `core/app.ts` | SDK entry point; initializes content instances |
| `core/tour.ts` | Tour step lifecycle: show, hide, close, element watching |
| `core/launcher.ts` | Launcher/beacon lifecycle |
| `core/checklist.ts` | Checklist lifecycle |
| `core/base-content.ts` | Shared lifecycle base class (extend this, never copy) |
| `core/element-watcher.ts` | CSS selector → DOM element monitoring with retry |
| `core/evented.ts` | Base event emitter (extend for event-driven classes) |
| `core/store.ts` | React-compatible external store |
| `utils/iframe-utils.ts` | Iframe communication bus and element search |
| `utils/iframe-sdk.ts` | SDK class injected into same-origin iframes |
| `utils/selector-parser.ts` | Parses `<<<` conditional selector syntax |
| `utils/conditions.ts` | Condition/trigger evaluation |
| `utils/logger.ts` | Structured logger (always use this, not console.log) |
| `utils/globals.ts` | Safe browser global wrappers (window, document, etc.) |
| `utils/event.ts` | AppEvents enum |
| `types/store.ts` | TourStore, ChecklistStore, LauncherStore type definitions |

### Shared Packages (`packages/shared/`)

| Package | Key export |
|---------|-----------|
| `finder/src/finderx.ts` | `finderV2(selector, document)` — resolves selectors to elements |
| `dom/` | `isVisibleNode`, `smoothScroll` |
| `helpers/` | `uuidV4`, `evalCode`, `convertSettings`, etc. |
| `types/` | All shared TypeScript types |

---

## Task Execution Approach

### For bug fixes
1. Reproduce the problem by reading the relevant code path
2. Identify the minimum change that fixes the root cause
3. Do not clean up surrounding code unless it directly caused the bug

### For new features
1. Find the existing component closest to what is needed
2. Extend it rather than creating a parallel implementation
3. Follow the phased approach: data structures → logic → lifecycle → cleanup

### For iframe-related work
The iframe integration has four coordinated components. Changes to one often
require changes to others. Always check:
- `IframeUtils` — does the communication bus need updating?
- Injected SDK string (`getIframeSDKCode`) — does the in-iframe behavior need updating?
- `ElementWatcher` — does element discovery or retry logic need updating?
- `Tour` / `Launcher` — does the virtual element or position update logic need updating?

---

## Code Quality Checks

Before finishing any task:

1. Run `pnpm check` — must pass with zero errors
2. Confirm no `console.log` in production code paths (use `logger.*`)
3. Confirm all async callbacks guard against stale state (step/content ID mismatch)
4. Confirm all timer/RAF IDs are stored and cancelled in `destroy()` / `reset()`
5. Confirm `iframe.contentDocument` access is wrapped in `try/catch`
6. Confirm injected script strings are self-contained (no module imports, no closure
   references to outer scope)

---

## Decision Rules

**Singleton vs instance:** Use a singleton only when there must be exactly one
coordinator across the whole page (e.g., `IframeUtils`, `App`). Content objects
(`Tour`, `Launcher`) are instances — one per content definition.

**Where to put new logic:**
- SDK-side communication logic → `iframe-utils.ts`
- Iframe-side logic → the inline string in `IframeUtils.getIframeSDKCode()`
- Element discovery → `element-watcher.ts`
- Step lifecycle → `tour.ts` (extending `base-content.ts` methods where possible)
- Pure DOM utilities → the relevant `packages/shared/` package

**When to emit events vs call methods directly:**
Use `this.trigger(AppEvents.X)` when the caller should not know what happens next
(decoupled). Call methods directly when the sequence is deterministic and local.

**Async error handling:**
Wrap calls that cross trust boundaries (iframe access, postMessage, external API)
in `try/catch`. Do not wrap internal calls that should never fail.

---

## Prohibited Actions

- Do not run `git push` without explicit user confirmation
- Do not amend published commits
- Do not delete branches without explicit user confirmation
- Do not bypass Biome checks (`--no-verify`)
- Do not access `window` / `document` directly in SDK code — use `globals.ts`
- Do not add `console.log` — use `logger.*`
- Do not modify `pnpm-lock.yaml` manually
