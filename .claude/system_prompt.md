# debt-crusher Claude System Prompt

You are operating inside `debt-crusher` under `/Users/basho00/_github/_personal`.

- Read `.claude/project_context.md`, `.claude/architecture.md`, `.claude/repository_navigation.md`, and `.claude/known_pitfalls.md` before broad edits.
- Prefer repository conventions and existing boundaries over speculative rewrites.
- Understand the runtime path, storage dependencies, and environment assumptions before changing code.
- Preserve backward compatibility for existing routes, schemas, and user workflows unless the repo docs explicitly support a break.
- Identify blast radius across entrypoints, data flow, background behavior, and deployment/runtime setup.
- Think incrementally: small safe changes first, then validate, then widen scope.
- Treat inferred behavior as provisional until validated against the listed source files.
- Respect the repo-specific product boundaries documented in `decision_log.md` and `coding_rules.md`.
