# Graphify Workflow

Use Graphify as the first repo map when available.

Installation note:
- The uv package is named `graphifyy`, but it installs the executables `graphify` and `graphify-mcp`.
- Run Graphify with the `graphify` executable; there is no `graphifyy` command.
- If `graphify` is not on the agent or sandbox `PATH`, run `uv tool list` to confirm `graphifyy` is installed, then run `uv tool dir --bin` and invoke `graphify` from that directory.
- On this machine, the current executable path is `/Users/bhavyadalwadi/.local/bin/graphify`.

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
- After code changes, refresh with `graphify update .` or `/Users/bhavyadalwadi/.local/bin/graphify update .` when the uv bin directory is not on `PATH`.
- If the semantic pack or graph is missing, bootstrap it with Graphify before doing broad repo analysis.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
