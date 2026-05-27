# debt-crusher Coding Rules

## Naming / Structure
- Use repo-local naming patterns from the existing modules and manifests
- Keep top-level boundaries stable: `app`, `components`, `lib`, `scripts`, `node_modules`, `graphify-out`

## Architecture Patterns
- Read Graphify semantic artifacts before broad source searching when `graphify-out/` exists.
- Preserve existing architecture and make the smallest safe change.
- Follow the existing split between app routes, shared UI, and repo-local data/util modules.
- Respect the current server/client boundary and avoid speculative framework rewrites.
- Treat the Prisma schema and generated client as part of the runtime contract.
- Forms-first and explicit save behavior are product rules, not just UI details.

## State Management
- Prisma or SQLite-backed persistence is the source of truth

## Error Handling / Logging
- Prefer explicit local validation and user-visible failure messages
- Console logging and focused route-level guardrails are the common default
- No centralized observability SDK is visible unless the repo docs say otherwise

## API Conventions
- Preserve current request and response shapes on existing routes
- Do not widen state-changing payloads when the repo is moving toward stronger authority or validation

## Testing Conventions
- `npm run test`

## Typing / Abstractions
- Follow existing typed request/data models where present
- Prefer thin adapters over broad rewrites when integrating providers or services

## Database / Migration Patterns
- Keep schema changes aligned with the repo's chosen persistence layer
- Call out migration or seed prerequisites explicitly when touching stateful flows
