# Project Status

## Current Phase

Project is in **active development** phase.

## Key Metrics

- Status: Active
- Last update: 2026-06-02
- Owner: Bhavya Dalwadi

## Recent Changes

- Prisma datasource switched from SQLite to Postgres for Vercel readiness
- Site-wide Basic Auth gate added for private access in local and Vercel
- Deployment path narrowed to direct Neon credentials via `DATABASE_URL`

## Known Issues

- Real Neon credentials still need to be added to local `.env` and Vercel env vars
- First real deploy still requires `npx prisma db push` against the Neon database

## Next Steps

- TODO: create or choose the Neon database instance
- TODO: replace placeholder `DATABASE_URL` with the real Neon connection string
- TODO: set `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` to real private values
- TODO: deploy to Vercel and confirm authenticated access against production

## Questions or Feedback

For questions about this project, refer to the [README.md](./README.md).
