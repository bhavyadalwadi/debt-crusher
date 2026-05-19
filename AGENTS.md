# Graphify Workflow

Use Graphify as the first repo map when available.

Rules:
- Read `graphify-out/repo-semantic-summary.md` before broad source searching.
- Read `graphify-out/repo-semantic.json` when you need structured fields.
- Use `graphify-out/GRAPH_REPORT.md` only for structural follow-up after the semantic pack.
- Prefer `graphify query`, `graphify path`, and `graphify explain` for targeted architecture questions.
- Respect `.graphifyignore`; do not add build, env, cache, or generated noise to the graph.
- Keep `graphify-out/` committed, but ignore:
  - `graphify-out/cache/`
  - `graphify-out/manifest.json`
  - `graphify-out/cost.json`
- After code changes, refresh with `graphify update .`
- If the semantic pack or graph is missing, bootstrap it with Graphify before doing broad repo analysis.
