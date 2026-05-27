# Incident Response Prompt

- Start with current runtime mode, env assumptions, and the narrowest failing entrypoint.
- Use `known_pitfalls.md` to rule out expected failure modes before deep code edits.
- Separate config/schema drift from true logic regressions.
