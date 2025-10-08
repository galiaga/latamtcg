## Performance Budget

- Target (production):
  - TTFB < 200 ms (with cache warm)
  - FCP < 1.5 s on Fast 3G/desktop throttling
  - JavaScript < 150 KB (gzipped) on initial route

### Measure locally with Lighthouse

Run Chrome Lighthouse against the deployed site or local build:

```bash
# build and start
npm run build && npm run start

# then open Chrome DevTools > Lighthouse and run Performance audit
```

### Compare dev vs prod timings

Dev includes compilation and HMR overhead that do not exist in prod. Use the helper script to measure production-mode page render:

```bash
npm run perf:prod
# → prints {"event":"perf.prod","url":"http://localhost:3000/mtg/search?q=past+in+flames&rarity=rare","serverRenderMs":123,"requestMs":145,"serverBootMs":800}
```

Expected ballpark on a warm cache (local):
- Dev: serverRenderMs 400–1200ms (depending on cold compiles), requestMs 500–1500ms
- Prod: serverRenderMs 80–200ms, requestMs 120–250ms


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
- SearchIndex: denormalized suggestions (multi-game). For MTG, one row per physical printing.

### Environment variables

- `DATABASE_URL`: PostgreSQL connection string (Prisma)
- `CRON_SECRET`: shared bearer token for the job endpoint
- Optional: `SCRYFALL_BATCH_SIZE` (default 500)
- Optional: `SCRYFALL_EXCLUDE_SET_TYPES` (default `token,memorabilia,alchemy,minigame`)
- Optional: `SEARCH_BACKEND` = `postgres` | `meilisearch` (default `postgres`)
- Optional: `SEARCH_LANGS` = `en` | `all` (default `en`)
- Optional: `SEARCH_SUGGESTION_LIMIT` (default 15)
- Optional: `SCRYFALL_IMAGE_HOST` (default `cards.scryfall.io`)

### Horizontal Scaling Configuration

- `CACHE_DRIVER`: `memory` (dev) | `redis` (prod) - Cache adapter selection
- `REDIS_URL`: Redis connection string for distributed caching
- `DB_POOL_SIZE`: Database connection pool size (default: 10 dev, 20 prod)

### Health Checks & Monitoring

- `/api/health`: Basic health check (fast path)
- `/api/health?deep=1`: Deep health check with DB/Redis connectivity
- Metrics: P50/P95 latencies, error rates flushed every 30s as JSON logs

### Load Testing

Run performance tests to validate scaling thresholds:

```bash
# Using k6 (recommended)
npm install -g k6
k6 run scripts/load-test.js

# Using Artillery (alternative)
npm install -g artillery
artillery run scripts/load-test.yml
```

**Performance Thresholds:**
- P95 API response time < 200ms
- P95 SSR render time < 400ms  
- Error rate < 0.5%

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
5. Build the search index (after ingest):
```bash
npm run searchindex:rebuild
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

Use the search box to type e.g. `teferi's pro`. Suggestions return individual printings (physical EN by default), plus a grouped "See all printings" when relevant.

If the database is empty, the page shows an empty state with a button to trigger the ingest locally (reads `CRON_SECRET` from your `.env`). In production, the route requires the bearer token and you should rely on the cron job.

### Printings & oracle groups

- `/mtg`: One row per card grouped by Scryfall `oracle_id` (shared rules text). Shows a representative image, printings count, and min/max USD across printings. Supports `?q=` (name contains) and `?page=` pagination.
- `/mtg/[oracleId]`: Lists all printings/versions for that oracle group with set code/name, collector number, rarity, variant tags (from `frame_effects` and `promo_types`), and USD prices for normal/foil/etched.

#### On-demand printing sync

The detail page will ensure all printings are present by fetching from Scryfall on view (paper/en only), using `oracleid:` search and upserting in batches. It uses a simple 1h lock to avoid stampedes.

Environment variables:

- `SCRYFALL_EXCLUDE_SET_TYPES` (default `token,memorabilia,alchemy,minigame`)
- `FORCE_SYNC_PRINTS_ON_VIEW` (set to `1` to force top-up every view in dev)

Manual sync API (dev allowed, prod requires `CRON_SECRET`):
```bash
curl -X POST http://localhost:3000/api/prints-sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -d '{"oracleId":"<ORACLE_ID>"}'
```

### Paper/English-only ingest and cleanup

The ingest keeps only physical (paper) English cards and skips certain set types. You can customize excluded set types with:

```bash
SCRYFALL_EXCLUDE_SET_TYPES=token,memorabilia,alchemy,minigame
```

If you previously ingested other languages or non-paper, run the one-off cleanup, then refresh the ingest:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run mtg:cleanup
npm run scryfall:refresh
```

### Job endpoint

`POST /api/jobs/scryfall-refresh` protected with `Authorization: Bearer $CRON_SECRET`.

`POST /api/jobs/searchindex-refresh` protected with `Authorization: Bearer $CRON_SECRET`.

Returns JSON: `{ updated: number, skipped: boolean, durationMs: number }`.

### Vercel Cron setup

`vercel.json` includes:
```json
{
  "crons": [
    { "path": "/api/jobs/scryfall-refresh", "schedule": "0 4 * * *" },
    { "path": "/api/jobs/searchindex-refresh", "schedule": "15 4 * * *" }
  ]
}
```

On Vercel:
- Set `DATABASE_URL` and `CRON_SECRET` in Project Settings → Environment Variables.
- Deploy. The cron will trigger daily at 04:00 UTC.

### Search API

- `GET /api/search?q=…&game=mtg&lang=en&limit=15`
- Returns unified items; for MTG, `kind: 'printing'` corresponds to a specific printing. A single `kind: 'group'` may appear at the top to link to `/mtg/[oracleId]`.
- Ranking prefers exact name, then prefix, then fuzzy; boosts EN/paper, variant modifiers (set:2x2, foil, etched, borderless, showcase, extended, retro, jp), and newer releases as tiebreaker.

### Multi-game extensibility

The `SearchIndex` is game-agnostic. To add Pokémon, Yu-Gi-Oh!, One Piece, or accessories:

1. Ingest your product/printing records into game-specific tables.
2. Write a mapper that flattens each printing into `SearchIndex` rows with appropriate `game`, `title`, `subtitle`, `keywordsText`, `variantLabel`, and `finishLabel`.
3. The `/api/search` route works unchanged; the `<SearchBox/>` renders unified results.

### Notes

- Scryfall data updates roughly daily; prices are reference values, not live market.
- Ingest streams and processes in batches to keep memory stable; default batch size is 500.
- Dual-faced or nonstandard cards without `image_uris` use the first face's `image_uris.normal` when present.

### Scryfall ingest (resumable, multi-phase)

The ingest now runs in three idempotent phases with checkpoints in `KvMeta`:

1. Download (resumable via ETag and HTTP range):

```bash
npm run scryfall:download
```
- Saves `data/scryfall-default-cards.json.gz` and `data/scryfall-download.meta.json` with `{ updatedAt, etag, uri }`.
- Stores ETag in `data/scryfall-default.etag` and resumes on retry.

2. Transform to NDJSON parts (paper/en only):

```bash
npm run scryfall:transform
```
- Streams the `.json.gz` from disk and writes `data/ndjson/part-00000.ndjson`, `part-00001.ndjson`, ... (100k rows each by default).
- Checkpoint key: `scryfall:default:ndjson` with `{ updatedAt, etag, lastPart }` so it can resume after the last completed part.

3. Bulk load via staging + set-based merge:

```bash
npm run scryfall:copy
```
- Loads each NDJSON part into an unlogged staging table and performs a single set-based UPSERT into `MtgCard`.
- Checkpoint key: `scryfall:default:copy` with `{ updatedAt, etag, lastPart }` to resume mid-copy.

Full refresh:

```bash
npm run scryfall:refresh
```

Notes:
- All phases are idempotent for the current `{updatedAt, etag}`.
- Progress logs every ~10k rows.
- You can tune memory: scripts run with `node --max-old-space-size=4096`.
- After ingest completes, rebuild the search index: `npm run searchindex:rebuild`.
