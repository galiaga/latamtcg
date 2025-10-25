# Manual PROD Validation Guide

## Prerequisites

1. **Set Environment Variables** (via Vercel CLI or Dashboard):
   ```bash
   SCRYFALL_BULK_DATASET=default_cards
   SCRYFALL_FILTER_PAPER_ONLY=true
   SCRYFALL_JSON_PARSE_MODE=stream
   ```

2. **Deploy Changes**:
   ```bash
   git push origin fix/cron-rollback
   # Wait for Vercel deployment to complete
   ```

## Manual Testing Commands

Replace `YOUR_APP_URL` and `YOUR_CRON_SECRET` with actual values:

### 1. Test Stage Route
```bash
curl -s "https://YOUR_APP_URL.vercel.app/api/cron/ingest-stage?token=YOUR_CRON_SECRET" | jq '.'
```

**Expected Response:**
```json
{
  "ok": true,
  "skipped": false,
  "paperOnly": true,
  "parseMode": "stream",  // or "buffer" if fallback triggered
  "allowed": true,
  "consistencyRatio": 0.98,  // between 0.95-1.05
  "rowsStaged": 85000,
  "durationMs": 15000
}
```

**Validation Checklist:**
- ✅ `paperOnly` == `true`
- ✅ `parseMode` in `{"stream", "buffer"}`
- ✅ `allowed` == `true`
- ✅ `consistencyRatio` in `[0.95, 1.05]`

### 2. Test Update Route
```bash
curl -s "https://YOUR_APP_URL.vercel.app/api/cron/ingest-update?token=YOUR_CRON_SECRET" | jq '.'
```

**Expected Response:**
```json
{
  "ok": true,
  "update": {
    "ok": true,
    "skipped": false,
    "cardsMatched": 82000,
    "rowsStaged": 85000,
    "durationMs": 5000
  },
  "history": {
    "ok": true,
    "skipped": false,
    "historyUpserts": 85000,
    "upsertsPerRow": 1.0,
    "durationMs": 3000
  },
  "retention": {
    "ok": true,
    "skipped": false,
    "durationMs": 1000
  }
}
```

**Validation Checklist:**
- ✅ `update.skipped` == `false`
- ✅ `update.cardsMatched / update.rowsStaged` ≥ `0.95`

### 3. Test History Route
```bash
curl -s "https://YOUR_APP_URL.vercel.app/api/cron/ingest-history?token=YOUR_CRON_SECRET" | jq '.'
```

**Expected Response:**
```json
{
  "ok": true,
  "skipped": false,
  "historyUpserts": 85000,
  "upsertsPerRow": 1.0,
  "rowsStagedToday": 85000,
  "durationMs": 3000
}
```

**Validation Checklist:**
- ✅ `skipped` == `false`
- ✅ `upsertsPerRow` ∈ `[1, 3]`
- ✅ `historyUpserts` ≤ `3 × rowsStagedToday`

## Memory Logging

If Stage falls back to buffer mode, look for this in the logs:
```
[json-to-csv] Using buffer parse mode...
[mem] 512 MB RSS
```

## Troubleshooting

### If Stage parseMode is "buffer":
- **Cause**: Stream parser stalled after 30 seconds
- **Action**: This is expected behavior - fallback worked correctly
- **Check**: Memory usage should be reasonable (<1GB)

### If consistencyRatio < 0.95:
- **Cause**: Too few cards matched (paper-only filter too restrictive)
- **Fix**: Check if `SCRYFALL_FILTER_PAPER_ONLY=true` is correct
- **Expected**: ~85k cards for paper-only mode

### If consistencyRatio > 1.05:
- **Cause**: Too many cards matched (filter not working)
- **Fix**: Verify `SCRYFALL_FILTER_PAPER_ONLY=true` is set
- **Expected**: Should be ~85k cards, not ~110k

### If Update skipped=true:
- **Cause**: Stage gating failed (consistency ratio out of range)
- **Fix**: Check Stage route results first
- **Action**: Re-run Stage route to fix gating

### If History skipped=true:
- **Cause**: Update gating failed
- **Fix**: Check Update route results first
- **Action**: Re-run Update route to fix gating

## Success Criteria

✅ **All routes return `ok: true` and `skipped: false`**  
✅ **Stage shows `paperOnly: true` and `parseMode: stream|buffer`**  
✅ **Consistency ratios are within acceptable ranges**  
✅ **Memory usage is reasonable if buffer fallback is used**  
✅ **Complete flow completes within 20 seconds**

## Automated Testing

Use the provided script:
```bash
# Edit the script to set your values
nano test-prod-validation.sh

# Run the automated test
./test-prod-validation.sh
```

The script will test all three routes and validate all metrics automatically.
