# Knowledge capture: write down what you had to discover

This repo's Claude docs (`CLAUDE.md`, `.claude/rules/`, `.claude/skills/`) should grow every time a task needs something they didn't already cover. If you spent real effort finding out how something works, where it lives, or how to build, run, or deploy it, save that before you finish so the next session doesn't repeat the search.

## When to capture
Capture after any task where you had to:
- find where a feature, asset, or script lives and how its parts connect (e.g. how the Usertour helper bookmarklet is built, where its source and minified output are, and how the web app serves it);
- work out a multi-step procedure: build, regenerate, deploy, cache-bust, seed data, run a specific test;
- learn a non-obvious convention, gotcha, or constraint by trial and error or from a failed attempt;
- find that an existing rule or skill was **wrong or stale**. Fix it right away.

Don't capture what's obvious from reading one file, one-off details of the current task, or anything git history already records.

## Where to put it
- **Skill** at `.claude/skills/<kebab-name>/SKILL.md`, for a *task or component* you'd be asked to work on ("modify the bookmarklet", "release the SDK"). Skills are discovered from their `description`, so write it as trigger phrases: what it is plus the words a user would use. Put helper scripts in `scripts/` next to it.
- **Rule** at `.claude/rules/<topic>.md`, for a *convention or fact* that applies whenever certain files are edited. Add `paths:` frontmatter to scope it, e.g. `paths: ["apps/sdk/**"]`. Leave it unscoped only if it applies everywhere.
- **`CLAUDE.md`**, only for short, repo-wide facts every session needs (core commands, layout).
- Prefer updating an existing skill or rule over creating a near-duplicate.

## What to write
Keep it short and concrete enough to act on without re-exploring:
- file paths (source vs. generated/minified), entry points, and how pieces connect;
- exact commands, in order, with their working directory;
- how to verify the change worked;
- gotchas: what broke, and why.

Skill skeleton:

```markdown
---
name: bookmarklet
description: How the Usertour helper bookmarklet works and how to modify, rebuild, and serve it. Use when asked to change, debug, or redeploy the bookmarklet.
---
# Usertour helper bookmarklet
## Where it lives
## How it works
## Making a change (steps + commands)
## Verify
## Gotchas
```

## Finish by telling the user
In your final message, list in one line each the skill or rule files you created or updated, so the user can review or commit them.
