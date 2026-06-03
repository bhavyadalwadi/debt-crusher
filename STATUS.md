# Project Status

## Current Phase

Project is in **active development** phase.

## Key Metrics

- Status: Active
- Last update: 2026-06-02
- Owner: Bhavya Dalwadi

## Recent Changes

- Prisma datasource switched from SQLite to Postgres for Vercel readiness
- Site-wide sign-in page and cookie session gate added for private access in local and Vercel
- Deployment path narrowed to direct Neon credentials via `DATABASE_URL`
- Deployment plan updated to use local SQLite for development and Neon for prod

## Known Issues

- Real Neon credentials still need to be added to Vercel env vars
- First real deploy still requires `npm run db:push:postgres` against prod Neon
- Project docs should be updated whenever deploy, auth, env, or runtime behavior changes

## Next Steps

- TODO: create or choose the Neon prod database instance
- TODO: replace Vercel `DATABASE_URL` with the real Neon prod connection string
- TODO: set `PRIVATE_ACCESS_USERNAME` and `PRIVATE_ACCESS_PASSWORD` to real private values
- TODO: validate the `/signin` flow in production after Vercel deploy
- TODO: deploy to Vercel and confirm authenticated access against production

## Questions or Feedback

For questions about this project, refer to the [README.md](./README.md).
