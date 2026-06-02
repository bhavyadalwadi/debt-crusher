# Local Database Setup

This app now uses a hosted Neon Postgres database for both local development and Vercel. The app no longer uses local SQLite.

## 1. Set local env
Copy the example env if you have not already:

```bash
cp .env.example .env
```

Then replace the placeholders with your real Neon credentials and private gate values:

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

This pushes the Prisma schema to Neon.

## 3. Start the app

```bash
npm run dev
```

## 4. Vercel

Set the same values in Vercel project env vars:
- `DATABASE_URL`
- `BASIC_AUTH_USERNAME`
- `BASIC_AUTH_PASSWORD`

Use the same Neon database unless you intentionally want a separate production database.
