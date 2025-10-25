# PROD Validation Commands

## 1. Set Vercel Environment Variables

Run these commands in your terminal:

```bash
# Set the three required environment variables
vercel env add SCRYFALL_BULK_DATASET production
# When prompted, enter: default_cards

vercel env add SCRYFALL_FILTER_PAPER_ONLY production  
# When prompted, enter: true

vercel env add SCRYFALL_JSON_PARSE_MODE production
# When prompted, enter: stream
```

## 2. Deploy to PROD

```bash
# Commit and push changes
git add .
git commit -m "Add memory logging for buffer fallback"
git push origin main

# Deploy to Vercel
vercel --prod
```

## 3. Test PROD Routes

After deployment, run these commands to test the three routes:

```bash
# Replace $CRON_SECRET with your actual cron secret
export CRON_SECRET="your-actual-cron-secret"

# Test Stage route
echo "=== STAGE ROUTE ==="
curl -s "https://your-app.vercel.app/api/cron/ingest-stage?token=$CRON_SECRET" | jq '.'

# Test Update route  
echo "=== UPDATE ROUTE ==="
curl -s "https://your-app.vercel.app/api/cron/ingest-update?token=$CRON_SECRET" | jq '.'

# Test History route
echo "=== HISTORY ROUTE ==="
curl -s "https://your-app.vercel.app/api/cron/ingest-history?token=$CRON_SECRET" | jq '.'
```

## 4. Validation Checklist

### Stage Route Validation:
- ✅ `paperOnly` == `true`
- ✅ `parseMode` in `{"stream", "buffer"}`
- ✅ `allowed` == `true`
- ✅ `consistencyRatio` in `[0.95, 1.05]`

### Update Route Validation:
- ✅ `skipped` == `false`
- ✅ `cardsMatched/rowsStaged` ≥ `0.95`

### History Route Validation:
- ✅ `skipped` == `false`
- ✅ `upsertsPerRow` ∈ `[1, 3]`
- ✅ `historyUpsertsToday` ≤ `3 × rowsStagedToday`

## 5. Memory Logging

If Stage falls back to buffer mode, look for this log:
```
[json-to-csv] Using buffer parse mode...
[mem] XXX MB RSS
```

## 6. Troubleshooting

If any validation fails, check:

1. **Stage parseMode is "buffer"**: Stream stalled, fallback triggered
2. **Consistency ratio < 0.95**: Too few cards matched (check paper-only filter)
3. **Consistency ratio > 1.05**: Too many cards matched (check dataset)
4. **Update skipped=true**: Stage gating failed
5. **History skipped=true**: Update gating failed

## Expected Results

With `SCRYFALL_JSON_PARSE_MODE=stream`, the system should:
- Start with streaming parser
- Fall back to buffer if stalled (after 30s)
- Log memory usage if buffer mode is used
- Complete within 20 seconds
- Show healthy consistency ratios
