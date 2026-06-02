# Debt Crusher

Forms-first debt management console for tracking credit cards, accounts, and payoff strategies.

## Overview

- Track credit cards, cash accounts, and payoff strategies
- Compare avalanche, snowball, and custom payoff approaches
- View history, trends, and actionable recommendations
- Import/export workbooks and backup data

## Tech Stack

Next.js + React + TypeScript + Prisma + Postgres

## Getting Started

```bash
npm install
npx prisma db push
npm run dev
```

Copy `.env.example` to `.env` first and set:

- `DATABASE_URL` to your direct Neon Postgres connection string
- `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` for the site-wide gate

## Vercel

- Use Neon as the hosted Postgres database
- Set `DATABASE_URL`, `BASIC_AUTH_USERNAME`, and `BASIC_AUTH_PASSWORD` in Vercel project env vars
- Run `npx prisma db push` against the Neon database before first use, or after schema changes
- The current setup intentionally uses one direct `DATABASE_URL` for both local and Vercel to keep config simple

See [STATUS.md](./STATUS.md) for project status.
