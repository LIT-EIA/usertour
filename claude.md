# Claude Guidelines — Usertour

## Repository Overview

Usertour is a pnpm monorepo managed with Turborepo.

```
apps/
  sdk/        TypeScript SDK injected into customer pages
  web/        React admin dashboard (Vite + Tailwind)
  server/     NestJS backend
packages/
  shared/     Shared utilities (finder, dom, helpers, types, etc.)
```

Primary implementation work happens in `apps/sdk/` and `packages/shared/`.

---

## Toolchain

| Tool | Purpose |
|------|---------|
| pnpm | Package manager; always use `pnpm` not `npm` or `yarn` |
| Turborepo | Build orchestration |
| Biome | Linting and formatting (replaces ESLint + Prettier) |
| TypeScript | All source files; strict mode |
| Vite | SDK and web app bundler |

Run checks before committing:
```
pnpm check        # biome check (lint + format)
pnpm check:fix    # auto-fix
pnpm build:sdk    # build SDK
```

---

## Formatting Rules (Biome)

These are enforced by CI — do not override them:

- **Indent**: 2 spaces (never tabs)
- **Quotes**: single quotes for JS/TS strings
- **Trailing commas**: always (including function parameters)
- **Semicolons**: always
- **Line width**: 100 characters
- **Line endings**: LF

---

## Linting Rules (Biome)

Rules that cause CI failures:

- `noUnusedImports` — error: remove every unused import
- `noUnusedVariables` — error: prefix intentionally unused vars with `_`
- `useConst` — error: use `const` unless reassignment is required
- `useTemplate` — error: use template literals instead of string concatenation
- `useOptionalChain` — error: use `?.` instead of `x && x.y`
- `noExplicitAny` — off (allowed, but minimize)
- `noNonNullAssertion` — off (allowed, but document why)

---

## TypeScript Conventions

- Enable strict null checks; never assume a value is non-null without a guard
- Prefer `unknown` over `any` for external data (postMessage payloads, API responses)
- Use `as const` for enum-like string unions
- Prefer named exports; avoid default exports in utility files
- Extend or implement existing interfaces from `@usertour/types` rather than duplicating

---

## Browser Globals

**Never access `window`, `document`, or `navigator` directly in SDK code.**

Use the safe wrappers exported from `apps/sdk/src/utils/globals.ts`:

```typescript
import { window, document, navigator } from './globals';
// These return undefined in non-browser contexts (SSR, workers)
```

---

## Logging

The SDK uses a structured logger at `apps/sdk/src/utils/logger.ts`.

```typescript
import { logger } from './logger';

logger.info('message', data);
logger.warn('message', data);
logger.error('message', error);
logger.critical('message');  // always logs, even without debug mode
```

Debug logging is gated behind `localStorage.setItem('debug', '*')` — it is silent
in production unless enabled. Use `logger.*` for all diagnostic output. Do not use
bare `console.log` in production code paths.

---

## Architecture Patterns

### Singleton

Use a static `getInstance()` method with a private constructor. Guard against
re-instantiation:

```typescript
export class MyUtil {
  private static instance: MyUtil;
  static getInstance(): MyUtil {
    if (!MyUtil.instance) MyUtil.instance = new MyUtil();
    return MyUtil.instance;
  }
}
export const myUtil = MyUtil.getInstance();
```

### Event System

Extend `Evented` from `apps/sdk/src/core/evented.ts`. Emit using
`this.trigger(event, payload)`. Subscribe using `.on(event, handler)` or
`.once(event, handler)`.

Event name constants live in `apps/sdk/src/utils/event.ts` (`AppEvents` enum).

### BaseContent

All tour-like content (tour steps, checklists, launchers) extends `BaseContent`
from `apps/sdk/src/core/base-content.ts`. It provides:
- `getStore()` / `setStore()` / `updateStore()` — React-compatible external store
- `getContent()` / `getCurrentStep()` / `setCurrentStep()`
- `reportEventWithSession()` — analytics event reporting
- `close()`, `reset()`, `destroy()` lifecycle hooks

When extending `BaseContent`, call `autoBind(this)` in the constructor (already
called in `BaseContent` itself).

### Store

State exposed to React components via `ExternalStore<T>` (a React 18 external
store). Update via `this.setStore({...})` or `this.updateStore({...})`.
Never mutate the store object directly.

---

## Async Patterns

- Use `async/await` throughout; avoid raw `.then()` chains unless composing streams
- Wrap all `iframe.contentDocument` access in `try/catch` — cross-origin access throws
- Guard all async callbacks against stale state (check that the current step/content
  ID still matches before acting)
- Store all `setTimeout` / `setInterval` / `requestAnimationFrame` IDs and cancel
  them in `destroy()` / `reset()`

---

## Cross-Frame Code

When writing code that runs inside an injected `<script>` in an iframe:

- The injected code string must be **entirely self-contained** — no imports, no
  closure variables from the enclosing scope
- Replicate any utility logic (visibility checks, selector parsing) inline
- Use the `window.<namespace>IframeSDK` global object pattern
- All `postMessage` calls to iframes use `'*'` as origin
- Filter incoming messages: check `event.source === window.parent` (in iframe) or
  `event.source !== window` (in parent)

---

## Package References

| Import path | Contents |
|-------------|---------|
| `@usertour/types` | Shared TypeScript types (`Step`, `SDKContent`, `ElementSelectorPropsData`, etc.) |
| `@usertour/helpers` | Pure utility functions (`uuidV4`, `evalCode`, `convertSettings`, etc.) |
| `@usertour-packages/finder` | CSS selector → DOM element resolution (`finderV2`) |
| `@usertour-packages/dom` | DOM utilities (`isVisibleNode`, `smoothScroll`) |
| `@usertour-packages/frame` | Shadow DOM frame utilities |
| `@usertour-packages/shared-editor` | Shared editor component types |

---

## What NOT to Do

- Do not add comments that explain what code does — name things clearly instead
- Do not add comments referencing the task, PR, or caller
- Do not write multi-line docstrings; a single JSDoc line on exported methods is acceptable
- Do not add error handling for impossible cases — trust internal invariants
- Do not add backwards-compatibility shims; change the code
- Do not introduce abstractions beyond what the task requires
- Do not access `window`/`document` directly — use the globals wrapper
- Do not use `console.log` directly — use the `logger` utility
