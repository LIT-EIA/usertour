# SDK keyboard focus tests

Covers the tour step focus loop in `src/core/step-focus-manager.ts` (WCAG 2.2: 2.4.3 Focus Order,
2.1.2 No Keyboard Trap, 2.4.7 Focus Visible, 2.4.11 Focus Not Obscured).

## Automated (Playwright)

```bash
pnpm --filter ./apps/sdk exec playwright install --with-deps chromium firefox webkit
pnpm --filter ./apps/sdk test:e2e
```

How it works:

- `global-setup.ts` bundles `harness.ts` (which exposes `StepFocusManager`) with Vite into
  `node_modules/.cache/e2e-harness/harness.js`.
- `fixtures/host.html` is a host page that removes focus outlines, with a same-origin host iframe
  (`frame.html`) and a tooltip iframe (`tooltip.html`, mirroring what `PopperContent` renders).
  Pages are served with `page.route` from a fake origin, so no server or backend is needed.
- An init script counts capture-phase listeners added to documents in every frame, to check that
  nothing is left behind after teardown.

The `Tour` lifecycle wiring (`close()`, `STEP_GOTO`, triggers, `checkStepVisible`) needs a running
backend and is covered by the manual steps below.

## Manual screen reader checks

Setup: a flow with 3 steps:

1. A tooltip step on a button target, with backdrop, skippable, with a heading and two buttons
   (Back / Next).
2. A tooltip step with **Block target** enabled and **not skippable** (no close X).
3. A modal step with backdrop and a question (multiple choice, single answer).

Before starting the flow, focus a known element on the host page (for example a search field).

### NVDA + Firefox, NVDA + Chrome

| # | Action | Expected |
|---|--------|----------|
| 1 | Start the flow | NVDA announces "Step 1 of 3: &lt;heading&gt;, dialog, Press Escape to close the tour." then reads the step content once (with *Automatic say all on page load* on, its default), starting with "Tooltip pointing to button &lt;target label&gt;. Use Tab to navigate between the tooltip and the button." (tooltip steps only; the Tab sentence only when the target, or a control inside it, is a tab stop; just the type, e.g. "Tooltip pointing to image.", when the target has no label or text). With it off, Down reads the content from the top. The Escape hint is never read as content, and the intro is never shown on screen. |
| 2 | Tab repeatedly | Back, Next, … Close, then the target button (announced with "Step 1 of 3: &lt;heading&gt;. Press Tab to move to the tour step…"), then Back again. Focus never reaches the rest of the page. |
| 3 | Shift+Tab from the tooltip's first button | Focus goes to the target. |
| 4 | On the target, press Down arrow (focus mode) | Focus goes to the first tooltip button. |
| 5 | Visual: focus the target | A white and dark ring is drawn around the target, even though the page hides outlines. Tooltip buttons show a 2px outline in the theme text color. Clicking with the mouse shows no outline. |
| 6 | Activate Next | Step 2 opens and focus moves into it. |
| 7 | Shift+Tab to the blocked target, press Enter and Space | Announced as "unavailable/dimmed". Nothing happens, and target actions don't run. |
| 8 | Press Escape (no close X on this step) | The flow closes and focus returns to the step 2 target (or, if it isn't focusable, to the element focused before the flow started). |
| 9 | Restart, go to step 3 (modal) | Announced as a modal dialog. Browse mode (NVDA+Space off, arrows) only reads the modal; the page is hidden. |
| 10 | In the multiple choice, use arrows | Arrows change the selected answer; they don't move to other controls. Tab moves to the next control. |
| 11 | Press Escape | The flow closes, the page is readable again, and focus is back on the element focused before the flow started. |
| 12 | Click on the page outside the tooltip during step 1 (no backdrop variant) | Focus stays where you clicked; Tab moves natively from there. Tab back into the target or tooltip resumes the loop. |
| 13 | Change step 1's target to a text element (a heading or paragraph), restart, Tab around | Focus only cycles through the tooltip controls; the text is never focused and gets no ring. If the text contains a link or field, only that control joins the loop. |
| 14 | Give a step a text field as target. Focus it, press Escape (JAWS: Escape first leaves forms mode; press it again) | The flow closes. Alt+Shift+X does nothing: Escape is the only close key, and the hint only names it. |

### VoiceOver + Safari (macOS)

Enable *Safari → Settings → Advanced → Press Tab to highlight each item on a webpage*.

| # | Action | Expected |
|---|--------|----------|
| 1 | Start the flow | VoiceOver announces "Step 1 of 3: &lt;heading&gt;, web dialog" and the Escape hint. |
| 2 | Tab / Shift+Tab | Same cycle as NVDA rows 2–3. |
| 3 | VO+Right in the tooltip | Reads the step content in order (the Escape hint is only part of the dialog description). |
| 4 | Focus the target | VoiceOver reads the target then its description ("Step 1 of 3 … Press Tab …"). |
| 5 | Escape on any step | Flow closes, focus restored as in NVDA rows 8 and 11. |
| 6 | Modal step: VO+Right past the last item | VoiceOver doesn't move into the page behind the modal. |

### French

The screen reader text follows the page's `<html lang>`: any French tag (`fr`, `fr-CA`, `fr-FR`…)
gets French, everything else gets English. The tooltip dialog and the target description also get
the page's `lang`, so the screen reader uses a French voice (the tooltip frame doesn't inherit the
page language on its own).

Set `<html lang="fr-CA">` on the host page and repeat NVDA rows 1–2 and VoiceOver rows 1 and 4:
expect "Étape 1 sur 3&nbsp;: &lt;heading&gt;", "Infobulle pointant vers le bouton &lt;target label&gt;. Utilisez Tab pour naviguer entre
l'infobulle et le bouton.",
"Appuyez sur Échap pour fermer la visite guidée." and, on the target, "Appuyez sur Tab pour aller à l'étape de la visite guidée…", read with a French voice.

## Checklist and bypass block

`checklist.spec.ts` covers the checklist in a shadow root, as the SDK renders it, with the bypass block
and the live region. Manual checks use a checklist with 3 tasks (one with a description, one that
starts a flow) and *Dismiss* allowed. Start with the checklist collapsed and focus on the page.

### NVDA + Firefox, NVDA + Chrome, JAWS + Chrome

| # | Action | Expected |
|---|--------|----------|
| 1 | Reload, press Tab once | A link "Skip to interactive help menu" appears at the top left of the page, before the page's own links. It isn't shown until focused, and it isn't there at all when no checklist or step is shown. |
| 2 | Press Enter on it | Focus goes to the launcher: "Get started, 2 tasks left, button, collapsed" (wording varies by screen reader). With a flow step open, it goes to the step instead. |
| 3 | Press Enter on the launcher | The panel opens and focus moves into it: "Get started, dialog, Press Escape to collapse the checklist.", then its content. |
| 4 | Tab through the panel | Collapse checklist (button, expanded), then each task as a button in a "Tasks" list of 3: "Create a project, completed", "Invite your team, not completed, Add people to the project"…, then Dismiss checklist. The page stays reachable (non-modal). |
| 5 | Browse mode: arrows over the progress bar | "Progress, 1 of 3 tasks completed" (not just a percentage). |
| 6 | Press Escape in the panel (JAWS: leave forms mode first, or use the collapse button) | The panel collapses and focus is back on the launcher. |
| 7 | Open again, activate the task that starts a flow | The panel collapses, the flow step opens and takes focus. Close the flow with Escape or its close button: the panel opens again and focus is back on that task (also when the flow ends normally). A later flow started from the launcher returns to the launcher. |
| 8 | With *ordered* completion, Tab to a locked task, press Enter | Announced as unavailable/dimmed with "Complete the previous tasks first."; nothing happens. |
| 9 | Complete a task elsewhere on the page (panel collapsed) | Without moving focus: "Task completed: Invite your team. 2 of 3 tasks completed". The launcher becomes "Get started, 1 task left". |
| 10 | Activate Dismiss checklist | Focus moves to "Dismiss checklist?" (grouped with its two buttons). Cancel puts focus back on Dismiss checklist; Yes, dismiss removes the checklist and the bypass block. |
| 11 | Let the checklist expand on its own (initial display *expanded*, or a task completed by a flow) while focus is on the page | Focus stays where it was. |
| 12 | Visual: Tab to the launcher and the panel controls | The launcher shows an outline inside its edge in the button text color; panel controls show the 2px theme outline. With *Reduce motion* on in the OS, completed tasks don't animate. |

### VoiceOver + Safari (macOS)

Same as rows 1–4, 6 and 9: the bypass block is in the rotor's links, the launcher is "Get started, 2
tasks left, collapsed, button", the panel is a "web dialog" and the announcement in row 9 is read
without moving the VoiceOver cursor.

### French

With `<html lang="fr-CA">`: the bypass block reads "Aller au menu d'aide interactif", the
launcher "Get started, 2 tâches restantes", the panel hint "Appuyez sur Échap pour réduire la liste
de tâches.", the tasks "…, terminée" / "…, non terminée", the progress "1 tâche terminée sur 3",
Dismiss "Masquer la liste de tâches" ("Masquer la liste de tâches ?", "Oui, masquer", "Annuler") and
the announcement "Tâche terminée : Invite your team. 2 tâches terminées sur 3". The checklist's own
content (title, task names, launcher text) is whatever the author wrote.

## Launchers

`launcher.spec.ts` covers the launcher's keyboard access. The visual launcher is rendered at the end
of the page, so a visually hidden button (`button[data-usertour-launcher-focus]`, a plain page element so modal focus traps find it) is placed
next to the target in its place in the page: right after the target when the launcher is on its
right or bottom, right before it when on its top or left. Manual checks use a page with a button
target "Save", an icon launcher on its right that shows a tooltip, and a second launcher on the top
of another target.

### NVDA + Firefox, NVDA + Chrome, JAWS + Chrome

| # | Action | Expected |
|---|--------|----------|
| 1 | Tab to "Save", Tab again | "Help: Save, button, collapsed" (a button launcher reads its own text). The visual launcher shows a white and dark ring. Tab again goes to the element after "Save", not to the end of the page. |
| 2 | Tab to the element before the second target | The second launcher comes before its target. |
| 3 | Browse mode: arrow through the page | The launcher is read right after (or before) its target, once; nothing is read at the end of the page. |
| 4 | Enter on the launcher | The tooltip opens and takes focus: "Help: Save, dialog, Press Escape to close the tooltip.", then its content, starting with "Tooltip pointing to button Save." (screen reader only, never shown; no Tab sentence, since Tab leaves the tooltip). |
| 5 | Tab through the tooltip, past its last control | The tooltip closes and focus moves to the element after the launcher. Shift+Tab before its first control closes it back on the launcher. |
| 6 | Open it again, press Escape | The tooltip closes and focus is back on the launcher ("expanded" becomes "collapsed"). |
| 7 | A launcher that runs actions: Enter or Space | Its actions run, as with a click. |
| 8 | A launcher on a paragraph below the fold: Tab from the element before it | Focus lands on the launcher, the page scrolls the paragraph into view and the launcher appears with its ring. |
| 9 | Hide the target (e.g. close the panel it's in) | Tab skips its launcher. |
| 10 | Inspect the visual launcher | A `<button type="button" tabindex="-1" aria-hidden="true">`: it works with the mouse, and isn't a second Tab stop at the end of the page. |
| 11 | Open a page modal (dialog) with a launcher on one of its controls, Tab through it | The launcher comes right after (or before) its target inside the modal, also when the target is the modal's last control, before focus wraps to the first. With the launcher on the left of the modal's first control (e.g. a Carbon modal's Close button), Tab from the last control wraps to the launcher, then the target. |

### French

With `<html lang="fr-CA">`: an icon launcher reads "Aide : Save", the tooltip intro "Infobulle pointant vers le bouton Save." and its hint "Appuyez sur
Échap pour fermer l'infobulle.".

### Turning it off

`usertour.setFocusManagement(false)` before a flow starts: no focus changes, no key handling, no
attributes added on targets.
