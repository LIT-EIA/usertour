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
