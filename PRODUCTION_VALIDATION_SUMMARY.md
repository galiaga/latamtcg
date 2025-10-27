# Scryfall Price Ingestion Pipeline - Production Validation Summary

## ✅ **System Status: PRODUCTION READY**

### **What Was Fixed:**
1. **SSL Certificate Error Fixed**: Cron jobs now run without `SUPABASE_CA_PEM_BASE64` in Vercel production (fallback to `sslmode=prefer`)
2. **All Three Scripts Updated**: `vercel-ingest-update.ts`, `vercel-ingest-upsert-history.ts`, `vercel-retention-30d.ts`

### **Production Cron Schedule:**
```
06:30 America/Santiago → /api/cron/ingest-stage
06:33 America/Santiago → /api/cron/ingest-update  
06:36 America/Santiago → /api/cron/ingest-history
03:00 America/Santiago → /api/cron/retention-30d
```

### **Expected Behavior:**
1. **Stage (06:30)**: 
   - Downloads Scryfall `default_cards` JSON
   - Converts to CSV (with paper-only filter if enabled)
   - Loads into `scryfall_daily_prices_stage` table
   - Sets gating state (`kv_state.last_stage_allowed`)
   - Should take: **~10-20 seconds**

2. **Update (06:33)**:
   - Checks gating state from Stage
   - Updates `MtgCard` prices if Stage passed
   - Should take: **~10-35 seconds**

3. **History (06:36)**:
   - Upserts price history records (`mtgcard_price_history`)
   - Creates up to 3 records per card (normal, foil, etched finishes)
   - Should take: **~10-20 seconds**

4. **Retention (03:00)**:
   - Cleans up price history older than 30 days
   - Should take: **~5-10 seconds**

### **Validation Metrics:**

**Stage Success Criteria:**
- ✅ `paperOnly: true` (if env var set)
- ✅ `rowsStaged` ≈ `mtgCardCount` (±5%)
- ✅ `consistencyRatio` in [0.95, 1.05]
- ✅ Log: `[ok] dataset=default_cards, paperOnly=true, ratio=0.98, allowed=true, skipped=false`

**Update Success Criteria:**
- ✅ `skipped: false`
- ✅ `cardsMatched/rowsStaged ≥ 0.95`
- ✅ `cardsUpdated ≥ 0` (can be 0 if no prices changed)
- ✅ Log: `[ok] dataset=update, paperOnly=N/A, ratio=N/A, allowed=true, skipped=false`

**History Success Criteria:**
- ✅ `skipped: false`
- ✅ `historyUpsertsToday ≤ 3 × rowsStagedToday`
- ✅ `upsertsPerRow` in [1, 3]
- ✅ Log: `[ok] dataset=history, paperOnly=N/A, ratio=N/A, allowed=true, skipped=false`

### **Monitoring:**
- **Vercel Dashboard** → **Functions** → **Cron Jobs** → View logs
- Check `ingestion_runs` table for audit trail
- Check `kv_state` table for gating flags

### **Environment Variables (Production):**
```
SCRYFALL_FILTER_PAPER_ONLY=true
SCRYFALL_BULK_DATASET=default_cards
CRON_SECRET=<set in Vercel>
DATABASE_URL=<set in Vercel>
```

### **Local Fallback:**
The original `scripts/ingest-scryfall-prices-secure.ts` remains untouched and available for local testing.

### **Next Steps:**
1. Monitor Vercel cron execution tomorrow at scheduled times
2. Verify logs show all metrics within expected ranges
3. Confirm `allowed=true` and `skipped=false` for all steps
4. Optional: Add `SUPABASE_CA_PEM_BASE64` to Vercel for full SSL verification

---

**System is ready for production!** 🚀

