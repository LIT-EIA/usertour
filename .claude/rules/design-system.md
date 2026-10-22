---
paths:
  - "apps/web/**"
  - "packages/**/*.{tsx,css}"
---
# Design system

Color tokens are CSS variables in `packages/shared/assets/web/base.css` (web app) and `packages/shared/assets/extension/base.css` (extension/SDK). **Use the Tailwind token classes** (`bg-primary`, `text-muted-foreground`, `bg-destructive`, ...), never raw hex or hsl values. If you need a token value, read it from `base.css` because that file is the source of truth.

Key tokens: `primary` (brand, `hsl(250 100% 60%)` / `#5533ff`), `secondary`, `accent`, `success`, `warning`, `destructive`, `background` (+ `-400/-700/-800/-900`), `foreground`, `muted-foreground`, `chart-1..5`. Every token has light and dark values.

## Usage
- Primary for main CTAs and active states; secondary for less prominent elements; accent for highlights; success/destructive/warning only for their semantic meaning.
- Buttons: primary is solid, secondary is bordered with a transparent/light background, danger uses destructive. Include loading states for async actions. Reuse `@usertour-packages/button` rather than styling buttons by hand.
- Cards: `rounded-lg`, `shadow-sm`, `p-4` or `p-6`, subtle borders.
- Forms: consistent inputs with clear focus/hover/error states, grouped fields, clear validation feedback, labels.
- Spacing on an 8px scale (8/16/24); responsive layouts; clear visual hierarchy.

## Accessibility
- Text contrast of at least 4.5:1; everything keyboard-reachable; ARIA on complex widgets; alt text for images/icons; semantic HTML.
