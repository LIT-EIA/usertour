# Usertour

Open-source user onboarding platform (in-app product tours, checklists, surveys). It's a pnpm + Turborepo monorepo on Node 20.

## Layout
- `apps/server`: NestJS + GraphQL backend (auth, users, projects, analytics, ...)
- `apps/web`: React admin/builder app; static files in `apps/web/public`
- `apps/sdk`: Usertour.js SDK embedded in customer apps
- `packages/components`, `packages/radix`: shared UI built on Radix primitives
- `packages/shared`: shared utilities, types, hooks, design tokens (`assets/`), and i18n (`i18n/src/{en-US,fr-CA}`)
- Config: `turbo.json`, `biome.json`, `pnpm-workspace.yaml`, `docker-compose.yml`, `Dockerfile`, `nginx/`

## Commands
```bash
pnpm dev:web | dev:sdk | dev:server    # run an app
pnpm build:web | build:sdk | build:server
pnpm check:fix                          # Biome lint + format (run before finishing)
```

## Rules and skills
- Coding conventions are in `.claude/rules/`. Path-scoped rules load automatically when matching files are touched.
- Task-specific know-how is in `.claude/skills/`.
- **Keep them current.** When a task makes you discover how something works or how to do something that these files don't already cover, write it down as a skill or rule before finishing. Follow `.claude/rules/knowledge-capture.md`.

Contributing workflow, PRs to `main`, and environment setup: see `CONTRIBUTING.md`.
