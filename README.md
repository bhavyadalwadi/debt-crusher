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

- `DATABASE_URL` to your local Postgres connection string
- `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` for the site-wide gate

## Vercel

- Use a separate Neon production database for Vercel
- Set `DATABASE_URL`, `BASIC_AUTH_USERNAME`, and `BASIC_AUTH_PASSWORD` in Vercel project env vars
- Use your prod Neon connection string for Vercel `DATABASE_URL`
- Keep your local `.env` pointed at a local-only Postgres database
- Run `npx prisma db push` against each database before first use, or after schema changes

See [STATUS.md](./STATUS.md) for project status.
