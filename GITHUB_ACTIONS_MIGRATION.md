# GitHub Actions Migration - Scryfall Price Ingestion

## ✅ Completed

### 1. CLI Entry Points (scripts/)
- ✅ `scripts/ingest-stage.ts` - Stage phase with JSON→CSV conversion
- ✅ `scripts/ingest-update.ts` - Update phase (staging → MtgCard)
- ✅ `scripts/ingest-history.ts` - History phase (upserts with idempotency)
- ✅ `scripts/ingest-retention.ts` - Retention phase (30-day cleanup)

### 2. GitHub Actions Workflow
- ✅ `.github/workflows/ingest-scryfall.yml` created
- ✅ Schedule: 09:30 UTC daily
- ✅ Timeout: 15 minutes
- ✅ Steps: Stage → Update → History → Retention

### 3. Environment & Security
- ✅ Removed dotenv usage in production/CI
- ✅ SSL hardening with SUPABASE_CA_PEM_BASE64
- ✅ No .env.local loading in NODE_ENV=production or CI=true
- ✅ Existing SSL configuration preserved in pipeline scripts

### 4. Guardrails
- ✅ ETag checking in Stage (skip if Scryfall data unchanged)
- ✅ Metadata stored in KvMeta table (key: scryfall_bulk_updated_at)
- ✅ Gating system intact (consistency checks, kv_state table)
- ✅ Idempotent history upserts via (card_id, value_date) unique constraint

### 5. Vercel Cleanup
- ✅ Disabled `/api/cron/ingest-all` scheduled cron in vercel.json
- ✅ Route still available for manual testing with ?token=$CRON_SECRET
- ✅ Only searchindex-refresh remains as scheduled Vercel cron

### 6. npm Scripts
- ✅ `ingest:stage` - Run Stage with CLI args
- ✅ `ingest:update` - Run Update
- ✅ `ingest:history` - Run History
- ✅ `ingest:retention` - Run Retention
- ✅ `ingest:all` - Run all phases sequentially

### 7. Documentation
- ✅ Comprehensive README section for GitHub Actions
- ✅ Secret setup instructions
- ✅ Local testing examples
- ✅ CLI script documentation
- ✅ ETag optimization explained
- ✅ Failure handling documented

## 📋 Next Steps (Manual)

### 1. Configure GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions:

```bash
# Required secrets:
DATABASE_URL           # PostgreSQL connection string from Supabase
SUPABASE_CA_PEM_BASE64 # Base64-encoded CA certificate

# To encode certificate:
cat certificate.pem | base64 | tr -d '\n'
```

### 2. Test the Workflow

**Option A: Manual trigger via GitHub UI**
1. Go to Actions tab
2. Select "Ingest Scryfall Daily"
3. Click "Run workflow"

**Option B: Via GitHub CLI**
```bash
gh workflow run ingest-scryfall.yml
```

### 3. Verify Workflow Run

Check the Actions tab for the workflow run and verify:

- ✅ Stage completes with `parseMode: buffer`, `consistencyRatio` in [0.95, 1.05]
- ✅ Update runs with `cardsMatched/rowsStaged ≥ 0.95`
- ✅ History runs with `upsertsPerRow` in [1, 3]
- ✅ Retention runs with `deletedRows ≥ 0`
- ✅ No SSL errors in logs
- ✅ Total time < 15 minutes

### 4. Verify Idempotency

Run the workflow again on the same day:

- ✅ Stage should skip (bulk data unchanged via ETag check) or complete normally
- ✅ Update/History should be idempotent (no duplicates)
- ✅ No errors

### 5. Monitor Production

After the first scheduled run (09:30 UTC):

- Check Actions tab for success/failure
- Verify database has updated prices
- Monitor for any errors or warnings
- Compare timing with expected ranges (<30s Stage, <80s total)

## 🔧 Local Testing

Test each phase locally before the first production run:

```bash
# Load your environment variables
export NODE_ENV=production
export SCRYFALL_BULK_DATASET=default_cards
export SCRYFALL_FILTER_PAPER_ONLY=true
export DATABASE_URL="postgresql://..."
export SUPABASE_CA_PEM_BASE64="..."

# Test Stage
npm run ingest:stage -- --paper-only --dataset=default_cards --hard-timeout-ms=120000

# Test Update
npm run ingest:update

# Test History
npm run ingest:history

# Test Retention
npm run ingest:retention

# Or test all at once
npm run ingest:all
```

## 🎯 Success Metrics

### Expected Timings (GitHub Actions)
- Stage: 10-30s (with buffer mode for paper-only)
- Update: 10-35s
- History: 10-20s
- Retention: 2-10s
- **Total**: <80s

### Data Quality
- Consistency ratio: 0.95-1.05 for paper-only
- Cards matched: ≥95% of staged rows
- History upserts: 1-3 per staged row (normal, foil, etched)

### Reliability
- SSL connections use proper CA verification (no insecure mode)
- ETag optimization reduces redundant processing
- Gating prevents bad data propagation
- Idempotent operations safe for retries

## 🚨 Troubleshooting

### Stage Times Out
- Check if `SCRYFALL_FILTER_PAPER_ONLY=true` is set
- Verify buffer mode is being used (`parseMode: "buffer"` in logs)
- Check network connectivity to Scryfall

### SSL Errors
- Verify `SUPABASE_CA_PEM_BASE64` is set correctly
- Re-encode the certificate: `cat cert.pem | base64 | tr -d '\n'`
- Ensure no trailing whitespace in the secret

### Gating Failures
- Check consistency ratio in Stage logs
- Verify MtgCard table has correct row count
- Review `kv_state` table for gating state

### Duplicate History Records
- Ensure unique constraint exists: `uq_price_hist_per_day` on `(scryfall_id, finish, price_day)`
- Check that `price_day` is being set correctly in America/Santiago timezone

## 📚 References

- Workflow: `.github/workflows/ingest-scryfall.yml`
- CLI Scripts: `scripts/ingest-*.ts`
- Pipeline Logic: `src/scripts/vercel-ingest-*.ts`
- Documentation: `README.md` (GitHub Actions section)
- Local Fallback: `scripts/ingest-scryfall-prices-secure.ts` (unchanged)

