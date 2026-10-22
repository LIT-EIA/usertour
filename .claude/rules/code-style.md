---
paths:
  - "**/*.{ts,tsx,js,jsx}"
---
# Code style (TypeScript / JavaScript)

Biome enforces formatting (`biome.json`): 2-space indent, semicolons, single quotes, 100-char lines, braces on every control statement. Run before finishing a change:

```bash
pnpm check:fix   # lint + format with fixes
```

## General
- Use optional chaining (`?.`) and nullish coalescing (`??`) for values that may be undefined; check arrays exist before calling array methods; validate objects before destructuring.
- ES6+ idioms: arrow functions, destructuring, spread. async/await over raw promise chains.
- Small single-purpose functions. No magic numbers/strings: use named constants.
- Comments explain *why*, not *what*. JSDoc for exported functions and classes.
- Clear descriptive names; avoid non-universal abbreviations.

## Error handling
- Handle errors in every async operation; no silent failures, log meaningfully.
- Messages should help debugging. Provide fallback UI / error boundaries for components that can fail.

## Imports
Group, with a blank line between groups, alphabetical within each:
1. React / framework
2. Third-party
3. Internal modules (`@usertour-packages/*`, `@/...`)
4. Relative imports (parents before children)
5. Type imports (`import type`)
6. Styles
