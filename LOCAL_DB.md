# Local Database Setup

This app now runs on local SQLite for development with Prisma. No Docker or Postgres install is required.

## 1. Use local SQLite
Copy the example env if you have not already:

```bash
cp .env.example .env
```

The local default connection string is:

```env
DATABASE_URL="file:./dev.db"
```

## 2. Generate Prisma client and create the local database schema

```bash
npm run prisma:generate
npm run db:push
```

This creates `prisma/dev.db` automatically.

## 3. Start the app

```bash
npm run dev
```

## 4. Switch to Neon later
When you are ready for Neon, you will need to:
- change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`
- replace `DATABASE_URL` in `.env` with your Neon connection string
- regenerate Prisma client
- push the schema

```bash
npm run prisma:generate
npm run db:push
```

The app code can stay the same; the Prisma datasource is the part that changes.
