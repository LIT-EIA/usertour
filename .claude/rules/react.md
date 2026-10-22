---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
---
# React components

## File and component structure
- One main component per file; file name matches the component. Organize by feature; use `index` files to re-export a directory.
- Order inside a file: imports, types, constants, component function, hooks, event handlers, helper render functions, JSX return.
- Destructure props in the signature and type them explicitly.
- Move business logic into custom hooks or services; components focus on rendering.
- Don't define nested components that close over parent scope; split them out into their own components.

## Performance
- `React.memo` for pure components; `useMemo` for expensive values or complex objects; `useCallback` for function props.
- Correct `useEffect` dependency arrays. No inline object/array literals passed as props in render.
- Stable `key`s for lists (not the index when avoidable).
- Lazy-load components that aren't needed right away; debounce rapid events (resize, scroll, input).

## State
- Local state with hooks; split complex state, or use `useReducer`. Keep state close to where it's used; use functional updates (`setCount(prev => prev + 1)`).
- Context / feature-scoped modules for shared state; don't overuse global state and document its shape.

## JSX
- Multiple attributes go one per line; self-close childless elements; extract complex expressions into variables.

## Styling
- Tailwind, utility-first; group related utilities; custom CSS only when needed, kebab-case class names.
