# Finance Console

## Responsibility
Handle setup values, credit cards, cash accounts, and ranked recommendations through explicit save-driven forms.

## Dependencies
- Node.js
- Next.js
- React
- TypeScript
- CSS
- JavaScript

## Inbound APIs
- server actions or route handlers behind the app-owned save/import/export flows

## Outbound APIs
- server actions or route handlers behind the app-owned save/import/export flows

## Databases Used
- Prisma-managed relational database
- SQLite or file-backed local data store

## Queues / Topics
- snapshot history creation on import/save
- import/export generation

## Critical Workflows
- CRUD for app-owned records
- save and reset semantics
- top recommendation explanation

## Failure Modes
- workbook import is secondary and should not be allowed to override the forms-first source-of-truth direction
- snapshot history exists, but event-level financial events are still pending
- heuristic ranking is explainable but still intentionally simple

## Scaling Concerns
- scale pressure will show up first in the stateful/data boundary
- no heavyweight horizontal scaling layer is visible from the repo docs

## Operational Concerns
- validate environment and schema prerequisites before changing behavior
- use the repo-local docs in `.claude/` plus Graphify entrypoints before editing

## Important Source Files
- `README.md`
- `Plan.md`
- `PLAN.md`
- `package.json`
- `README.MD`

## Dangerous Code Paths
- workbook import is secondary and should not be allowed to override the forms-first source-of-truth direction
- snapshot history exists, but event-level financial events are still pending
- heuristic ranking is explainable but still intentionally simple

## Testing Strategy
- `npm run test`

## Known Technical Debt
- richer recommendation engine - due-date pressure explanation improvements
- richer recommendation engine - promo-pressure explanation improvements
- richer recommendation engine - more nuanced status thresholds
- richer activity insights - stronger historical comparison views
- event-level tracking beyond snapshots - explicit payment events
- event-level tracking beyond snapshots - explicit balance update events
