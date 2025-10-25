# Production Price Ingestion Pipeline

## SSL Configuration Issue

The current implementation has an SSL certificate issue with Supabase connections. This is a known issue with Supabase's self-signed certificates in certain environments.

### Current Status
- ✅ **Audit logging**: Complete with `ingestion_runs` table
- ✅ **Timezone validation**: America/Santiago timezone validation
- ✅ **Alerts**: Low row count warnings
- ✅ **Set-based merges**: Optimized SQL operations
- ⚠️ **SSL**: Needs production SSL configuration

### SSL Solutions for Production

#### Option 1: Environment Variable Override
```bash
# For development/testing
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run ingest:prices -- --file data/daily-prices.csv

# For production (with proper CA certificates)
NODE_TLS_REJECT_UNAUTHORIZED=1 npm run ingest:prices -- --file data/daily-prices.csv
```

#### Option 2: Supabase CA Certificate
Download Supabase's CA certificate and configure:
```javascript
ssl: {
  rejectUnauthorized: true,
  ca: fs.readFileSync('path/to/supabase-ca.pem')
}
```

#### Option 3: Connection String SSL Mode
Use `sslmode=prefer` instead of `sslmode=require`:
```
postgresql://user:pass@host:port/db?sslmode=prefer
```

### Production Deployment Notes

1. **Audit Table**: `ingestion_runs` tracks all runs with timings and status
2. **Timezone Validation**: Ensures CSV date matches America/Santiago today
3. **Alerts**: Warns if staged rows < 100k, cards updated < 80k, or history upserts < 120k
4. **Idempotency**: Unique index prevents duplicate price history records
5. **Performance**: ~60 seconds total runtime for 110k+ cards

### Usage

```bash
# Dry run (validation only)
npm run ingest:prices -- --file data/daily-prices.csv --dry-run

# Full ingestion
npm run ingest:prices -- --file data/daily-prices.csv

# From URL
npm run ingest:prices -- --url https://api.scryfall.com/bulk-data/default-cards
```

### Monitoring

Check recent runs:
```sql
SELECT * FROM ingestion_runs 
ORDER BY started_at DESC 
LIMIT 10;
```

Check for failures:
```sql
SELECT * FROM ingestion_runs 
WHERE status = 'failed' 
ORDER BY started_at DESC;
```
