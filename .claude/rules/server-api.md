---
paths:
  - "apps/server/**"
---
# Server (NestJS + GraphQL)

Entry: `apps/server/src/main.ts` (bootstrap), `app.module.ts` (root module), `app.resolver.ts`, `app.controller.ts`, `gql-config.service.ts`.

Modules in `apps/server/src/`:
- Business: `auth` (JWT, strategies, guards), `users`, `projects`, `content`, `team`, `biz`, `analytics`, `subscription`, `integration`
- Config: `environments`, `themes`, `attributes`, `localizations`, `events`
- Infrastructure: `web-socket`, `utilities`, `utils`, `common`, `adapters`, `openapi` (REST + OpenAPI docs), `email-templates`

Conventions:
- Each feature is a Nest module with resolvers, services, guards, and DTOs. Use DI, and guards for authorization.
- Validate input with DTOs; handle errors explicitly. Document with GraphQL schema / OpenAPI.
- Real-time features go through `web-socket`.

Gotchas:
- `schema.graphql` is generated at startup from the code-first models (`autoSchemaFile` in `gql-config.service.ts`). The path is resolved from the server package root, so it's always `apps/server/src/schema.graphql`, whatever directory the server starts from. Commit it with the model change that caused the diff. Biome ignores it (`biome.json`), so `pnpm check:fix` leaves it alone.
- The `@nestjs/graphql` CLI plugin listed in `nest-cli.json` is **not applied** by a clean `nest build` (verified 2026-11-23: no `_GRAPHQL_METADATA_FACTORY` in `dist/`). The plugin loads TypeScript 5.1.6 from its own dependencies, while the build uses another version (server 4.9.5, CLI 5.3.3), and the plugin silently skips AST nodes from a different TypeScript instance. As a result, an optional property with an explicit `@Field(() => X)` stays non-nullable (`X!`). The committed schema matches this clean-build output. A `dist` built with the plugin working makes 8 fields nullable (`Attribute.description`, `BizModel.membership`, `BizUser.membership`, `Common.count`, `CopyThemeInput.name`, `CreateAttributeInput.description`, `Environment.launcherFocusTrap`, `User.projects`). If those diffs appear, discard them unless you're fixing the plugin on purpose, which changes the API.
