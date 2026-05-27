# debt-crusher Architecture

## End-to-End Request Flows
- Browser forms -> app-owned save/import flow -> Prisma -> SQLite -> dashboard metrics/recommendation ranking -> charts/history

## Frontend / Backend Interaction
- API boundaries are repo-local; inspect the listed entrypoints before changing wire contracts

## Service Boundaries
- Next.js forms-first finance workspace
- Prisma persistence layer
- local workbook and JSON import/export tools

## Sync vs Async Flows
- snapshot history creation on import/save
- import/export generation

## Event-Driven Architecture
- No dedicated event bus, broker, or queue consumer layer is visible in the inspected files.

## Caching Layers
- Next.js build/runtime caching may affect server/client rendering behavior
- No dedicated cache layer is called out; the product treats persisted records and activity snapshots as the truth source.

## Auth Flow
No auth layer is called out in the current build plan.

## Deployment Topology
Local Next.js app today; data model is intentionally shaped so the datasource can later switch to hosted Postgres/Neon.

## Scaling Behavior
- Active repo; scaling pressure will first appear in the data/API boundary rather than in broad service fan-out
- No autoscaling or multi-region story is visible unless infra files explicitly add one

## Resilience Mechanisms
- Focused local tests or e2e coverage
- typed validation and repo-local guardrails where implemented
- manual fallbacks remain part of the operating model for many repos in this workspace

## Failover Behavior
- No formal failover topology is documented; failure handling is mostly local retries, manual restart, or degraded fallback.

## Observability Architecture
- console logs and local UI feedback are the default observability path

## Retry / Idempotency Patterns
- protect state-changing endpoints from duplicate actions where the repo explicitly calls this out
