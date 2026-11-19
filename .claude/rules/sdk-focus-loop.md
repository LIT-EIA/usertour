---
paths:
  - "apps/sdk/src/core/step-focus-manager.ts"
  - "apps/sdk/src/core/tabbable.ts"
  - "apps/sdk/src/core/target-intro.ts"
  - "apps/sdk/src/components/launcher.tsx"
  - "apps/sdk/e2e/**"
---
# SDK focus loop (tooltip/launcher <-> target)

- `core/tabbable.ts`: `FOCUSABLE_SELECTOR` (native HTML focusables + `[tabindex]`) and `getTabbables(root)`.
  Used for tooltip/launcher content and for controls *inside* a target. ARIA roles don't matter here:
  the browser can't focus an element that has a role but no tabindex.
- `core/step-focus-manager.ts` `isInteractive(target)`: decides whether the *target itself* joins the loop.
  Order: native `disabled` -> ARIA role (first token, `hasInteractiveRole`) -> explicit `tabindex` (>= 0 joins)
  -> `FOCUSABLE_SELECTOR`. The role comes before tabindex on purpose: roving-tabindex widgets (inactive tabs in
  Dojo, Radix, MUI; menu/tree items) have `tabindex="-1"` but are interactive. A plain element with
  `tabindex="-1"` and no role stays out. A target that only has a role gets `tabindex="-1"` (restored on destroy).
- Role lists follow WAI-ARIA 1.2 widget roles (https://www.w3.org/TR/wai-aria-1.2/#widget_roles):
  - `INTERACTIVE_ROLES`: standalone widgets, always join. Left out on purpose: `progressbar` (read-only),
    `separator` and `tabpanel` (interactive only with a tabindex, already covered).
  - `COMPOSITE_ROLES` (combobox, grid, listbox, menu, menubar, radiogroup, tablist, tree, treegrid): the container
    joins only when it has no tabbable descendant (aria-activedescendant pattern). With a roving tabindex,
    the child with `tabindex="0"` is the stop, so adding the container would create an extra stop.
  - `NATIVE_ARROW_ROLES`: roles whose arrow keys belong to the widget, so arrows don't move to the tooltip.
- `target-intro.ts` uses `getTargetTabStops()` to decide whether to announce "Use Tab to navigate...".

## Tests
- Playwright: `apps/sdk/e2e/focus-loop.spec.ts`, fixtures in `apps/sdk/e2e/fixtures/host.html`
  (see `apps/sdk/e2e/README.md`). Run `pnpm --filter ./apps/sdk test:e2e` (6 projects: 3 browsers x iframe/shadow).
- Browsers need Linux system libraries (`playwright install-deps`, needs root). In the Coder workspace the
  `dev-container` branch's `main.tf` installs them on every start.
- Gotcha: `host.html` is shared, and some tests Tab through the host page in order (e.g. teardown expects
  `#target` -> `#wrap-input`). Put new fixtures with tab stops after the iframe so they don't change those paths.
