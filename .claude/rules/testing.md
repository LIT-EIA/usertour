---
paths:
  - "**/*.spec.ts"
  - "**/*.test.{ts,tsx}"
  - "**/e2e/**"
  - "apps/server/test/**"
---
# Testing

Tooling:
- Server: Jest. `pnpm --filter ./apps/server test`, plus e2e via `test:e2e` (`apps/server/test/jest-e2e.json`). Specs are `*.spec.ts`.
- SDK: Playwright e2e. `pnpm --filter ./apps/sdk test:e2e` (`apps/sdk/e2e/playwright.config.ts`).

Practices:
- Unit tests isolate a function or component and mock external dependencies. Integration tests use realistic data.
- Cover rendering, interactions, props/state changes, error states, and edge cases. For APIs, cover validation, error handling, and authorization.
- Arrange/Act/Assert; descriptive names; tests that are independent and atomic; grouped by feature.
