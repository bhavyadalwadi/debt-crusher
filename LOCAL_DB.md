# Local Database Setup

This app uses SQLite locally and a separate Neon Postgres database in Vercel production.

## 1. Set local env
Copy the example env if you have not already:

```bash
cp .env.example .env
```

Then keep the local SQLite path and set your private sign-in values:

```env
DATABASE_URL="file:./dev.db"
PRIVATE_ACCESS_USERNAME="..."
PRIVATE_ACCESS_PASSWORD="..."
```

## 2. Generate Prisma client and push the schema

```bash
npm run prisma:generate
npm run db:push
```

This creates or updates your local SQLite database at `prisma/dev.db`.

## 3. Start the app

```bash
npm run dev
```

The app will redirect unauthenticated users to `/signin`.

## 4. Vercel

Set these values in Vercel project env vars:
- `DATABASE_URL`
- `PRIVATE_ACCESS_USERNAME`
- `PRIVATE_ACCESS_PASSWORD`

For Vercel, `DATABASE_URL` should point to the separate Neon prod database.
