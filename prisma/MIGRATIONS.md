# Operations-core database rollout

1. Back up the SQLite file or create a Neon branch/backup before schema changes.
2. New local SQLite databases can apply the committed baseline with `npm run db:migrate`.
3. Existing unversioned SQLite databases should first be marked as baselined with `prisma migrate resolve --applied 20260810031500_operations_core`, then receive the additive schema with `npm run db:push`.
4. Run `npm run db:backfill:operations` once to copy legacy card configuration into normalized records without changing current balances.
5. Run `npm run db:verify:operations`; account counts and stable IDs must match before deployment.
6. PostgreSQL uses the separately reviewed baseline in `prisma/migrations-postgres/`. Apply the schema with `npm run db:push:postgres`, then use the `:postgres` backfill and verification scripts documented in the main README.

Rollback is application-first: redeploy the preceding version while retaining additive tables. The migration intentionally does not remove legacy columns or JSON snapshots, so no destructive database rollback is required for this release.
