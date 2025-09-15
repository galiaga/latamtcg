This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Scryfall MTG catalog + prices ingest

This app ingests the Scryfall `default_cards` bulk dataset daily and stores a minimal catalog with reference prices.

### Database schema (Prisma)

Models:

- MtgCard: core MTG printing fields, prices, legalities, and Scryfall timestamps
- KvMeta: simple key/value store for bookkeeping (e.g., last seen updated_at)

### Environment variables

- `DATABASE_URL`: PostgreSQL connection string (Prisma)
- `CRON_SECRET`: shared bearer token for the job endpoint
- Optional: `SCRYFALL_BATCH_SIZE` (default 500)

### Run locally

1. Install deps:
```bash
npm install
```
2. Set env vars (e.g., in a `.env` file):
```bash
DATABASE_URL=postgres://user:pass@localhost:5432/latamtcg
CRON_SECRET=choose-a-strong-random-value
```
3. Generate client and run migration:
```bash
npm run prisma:generate
npm run prisma:migrate
```
4. Run the ingest locally:
```bash
npm run scryfall:refresh
# or
npx ts-node scripts/run-scryfall-refresh.ts
```

### See the MTG table today

1. Ensure the ingest has been run at least once (see above), or trigger it:
   - CLI: `npm run scryfall:refresh`
   - API (dev):
```bash
curl -X POST http://localhost:3000/api/jobs/scryfall-refresh \
  -H "Authorization: Bearer $CRON_SECRET"
```
2. Start the dev server:
```bash
npm run dev
```
3. Open `/mtg` in your browser.

If the database is empty, the page shows an empty state with a button to trigger the ingest locally (reads `CRON_SECRET` from your `.env`). In production, the route requires the bearer token and you should rely on the cron job.

### Job endpoint

`POST /api/jobs/scryfall-refresh` protected with `Authorization: Bearer $CRON_SECRET`.

Returns JSON: `{ updated: number, skipped: boolean, durationMs: number }`.

### Vercel Cron setup

`vercel.json` includes:
```json
{
  "crons": [
    { "path": "/api/jobs/scryfall-refresh", "schedule": "0 4 * * *" }
  ]
}
```

On Vercel:
- Set `DATABASE_URL` and `CRON_SECRET` in Project Settings → Environment Variables.
- Deploy. The cron will trigger daily at 04:00 UTC.

### Notes

- Scryfall data updates roughly daily; prices are reference values, not live market.
- Ingest streams and processes in batches to keep memory stable; default batch size is 500.
- Dual-faced or nonstandard cards without `image_uris` use the first face's `image_uris.normal` when present.
