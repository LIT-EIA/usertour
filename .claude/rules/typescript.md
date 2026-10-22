---
paths:
  - "**/*.{ts,tsx}"
---
# TypeScript

- Avoid `any`. Use `unknown` plus type guards instead.
- Give explicit return types to functions, especially exported/public ones.
- Reuse and derive types instead of redeclaring them: extend with `&`, or use `Partial`, `Pick`, `Omit`, `Readonly`, `Record`.
- Import types with `import type`, grouped separately from value imports. Don't create local aliases for imported types without reason.

```typescript
interface User { id: string; name: string }
type UserWithEmail = User & { email: string };   // good
type UserIdAndName = Pick<User, 'id' | 'name'>;  // good
// bad: a fresh `interface UserDetails { id; name; email }` duplicating User
```
