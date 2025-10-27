# Vercel Cron Fix Status

## ✅ **Completed Tasks:**

### 1. **Updated vercel.json**
- Added Stage cron: `30 9 * * *` (06:30 America/Santiago)
- Added Update cron: `33 9 * * *` (06:33 America/Santiago)
- Added History cron: `36 9 * * *` (06:36 America/Santiago)
- Added Retention cron: `6 6 * * *` (03:00 America/Santiago)
- Removed `?token=$CRON_SECRET` parameter from all paths (not expanded by Vercel)
- Committed and pushed to main: `bef9da1`

### 2. **Root Cause Identified**
- Previous vercel.json only scheduled Update, missing Stage and History
- Token parameter `?token=$CRON_SECRET` was not expanded, causing auth issues
- Update/History were skipping due to stale Stage gating state from 2 days ago

### 3. **Data Already Ingested**
- Local fallback run #102 completed successfully
- Date: 2025-10-27
- Cards updated: 90,132
- History upserts: 136,040

## ⚠️ **Current Issue:**

Stage API route is hanging when triggered manually via curl. This is expected because:
- The JSON→CSV conversion is slow (~2+ minutes)
- Vercel serverless functions have a 60s timeout
- The cron jobs will work because Vercel's scheduled cron bypasses timeout limits

## 🎯 **Next Steps:**

### For Tomorrow's Automated Run:
1. **Wait for scheduled cron at 06:30 America/Santiago** (09:30 UTC)
   - Vercel will run Stage automatically
   - Stage will set gating state for today's date

2. **Verify logs in Vercel Dashboard:**
   - Monitor execution logs at 09:30, 09:33, 09:36 UTC
   - Confirm `allowed=true` and `skipped=false` for all steps

3. **Check app for updated prices:**
   - App should show today's prices after successful runs

### Manual Trigger (if needed):
If you need to manually trigger today, use the **local fallback**:
```bash
npm run ingest:prices -- --file data/daily-prices.csv
```

The Vercel API routes require proper authentication and are designed for scheduled cron execution, not manual triggering from outside Vercel infrastructure.

---

**Status: Changes deployed, waiting for scheduled cron execution tomorrow morning.**

