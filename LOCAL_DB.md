# Local Database Setup

This app now uses hosted Neon Postgres databases. Local development uses one Neon database, and Vercel production uses a separate Neon prod database. The app no longer uses local SQLite.

## 1. Set local env
Copy the example env if you have not already:

```bash
cp .env.example .env
```

Then replace the placeholders with your real local/dev Neon credentials and private gate values:

```env
DATABASE_URL="postgresql://..."
BASIC_AUTH_USERNAME="..."
BASIC_AUTH_PASSWORD="..."
```

## 2. Generate Prisma client and push the schema

```bash
npm run prisma:generate
npm run db:push
```

This pushes the Prisma schema to your local/dev Neon database.

## 3. Start the app

```bash
npm run dev
```

## 4. Vercel

Set these values in Vercel project env vars:
- `DATABASE_URL`
- `BASIC_AUTH_USERNAME`
- `BASIC_AUTH_PASSWORD`

For Vercel, `DATABASE_URL` should point to the separate Neon prod database.
