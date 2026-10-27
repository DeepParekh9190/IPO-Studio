# IPO Studio

Public IPO catalog and poster generator, with a one-password admin and automatic IPO sync.

## Local setup

```bash
npm install
cp .env.example .env       # fill DATABASE_URL and ADMIN_PASSWORD
npm run db:migrate
npm run dev
```

Open `http://localhost:3000/admin/login`, sign in, then click **Sync now** to fill the catalog from the upstream feed. Without `DATABASE_URL`, the public site runs read-only from the upstream fallback.

## Production

- Vercel + Postgres (Neon works) + Vercel Blob (use a public store for logos).
- Set `DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `CRON_SECRET`, and `BLOB_READ_WRITE_TOKEN`.
- With Neon, `neon deploy` fills `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` in `.env.local`; migrations use the unpooled URL.
- Run `npm run db:migrate` once against the production database.
- `vercel.json` runs `/api/cron/sync` daily (Hobby plan limit). On Pro, change the schedule to every 30 minutes for fresher GMP.
- New synced IPOs publish automatically. Editing an IPO in admin locks it from sync; unpublishing is preserved.

## Commands

```bash
npm run dev
npm test
npx tsc --noEmit
npm run build
npm run db:generate
npm run db:migrate
```

Data source: `ipopremium.in`. It is unofficial; check its terms before relying on it commercially.
