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

- `DATABASE_URL` to the local default SQLite path, or another local SQLite file path
- `PRIVATE_ACCESS_USERNAME`, `PRIVATE_ACCESS_PASSWORD`, and `SESSION_SECRET` for the shared sign-in page

## Vercel

- Use a separate Neon production database for Vercel
- Set `DATABASE_URL`, `PRIVATE_ACCESS_USERNAME`, `PRIVATE_ACCESS_PASSWORD`, and `SESSION_SECRET` in Vercel project env vars
- Use your prod Neon connection string for Vercel `DATABASE_URL`
- Keep your local `.env` pointed at local SQLite
- Run `npm run db:push` for local SQLite
- Run `npm run db:push:postgres` against Neon before first use, or after schema changes
- The app now uses a custom `/signin` page with an HttpOnly session cookie instead of the browser Basic Auth popup

## Auth Model

- users sign in with `PRIVATE_ACCESS_USERNAME` and `PRIVATE_ACCESS_PASSWORD`
- the server validates those credentials and issues an `HttpOnly` session cookie
- `SESSION_SECRET` is server-only and signs the cookie; it is not entered in the browser
- if `SESSION_SECRET` changes, existing sessions become invalid and users must sign in again
- if any of the three auth env vars are missing, the app returns to the existing config-error behavior

See [STATUS.md](./STATUS.md) for project status.
