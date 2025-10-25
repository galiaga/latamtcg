# Secure SSL Configuration for Supabase Price Ingestion

## Overview

This document provides step-by-step instructions for configuring secure SSL connections to Supabase without using `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## Prerequisites

- Supabase project with Session Pooler enabled
- Access to Supabase Dashboard
- Node.js environment (local or Vercel)

## Step 1: Get Supabase CA Certificate

### Option A: Download from Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Database** → **SSL**
3. Click **Download certificate**
4. Save the certificate as `supabase-ca.pem` in your project root

### Option B: Use Environment Variable (Recommended for Vercel)

1. Download the certificate as above
2. Copy the entire certificate content (including `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----`)
3. Set environment variable:
   ```bash
   export SUPABASE_CA_PEM="-----BEGIN CERTIFICATE-----
   MIIE... (certificate content)
   -----END CERTIFICATE-----"
   ```

## Step 2: Verify Session Pooler URL

Ensure your `DATABASE_URL` uses the Session Pooler:

```bash
# Should look like this:
postgresql://postgres.xxx:password@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=verify-full
```

**NOT** the direct connection:
```bash
# Avoid this:
postgresql://postgres.xxx:password@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=verify-full
```

## Step 3: Test SSL Connection

### Local Testing with psql

```bash
# Test with psql (replace with your actual values)
psql "sslmode=verify-full sslrootcert=./supabase-ca.pem host=aws-1-us-east-2.pooler.supabase.com port=6543 dbname=postgres user=postgres.xxx password=your_password"
```

If this works, your certificate and host verification are correct.

### Test the Ingestion Script

```bash
# Dry run test
npm run ingest:prices -- --file data/daily-prices.csv --dry-run

# Full test
npm run ingest:prices -- --file data/daily-prices.csv
```

## Step 4: Vercel Deployment

### Environment Variables

Set these in Vercel dashboard:

```bash
DATABASE_URL=postgresql://postgres.xxx:password@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=verify-full
SUPABASE_CA_PEM=-----BEGIN CERTIFICATE-----
MIIE... (full certificate content)
-----END CERTIFICATE-----
```

### Vercel Cron Job

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/jobs/scryfall-refresh",
      "schedule": "30 6 * * *"
    }
  ]
}
```

## SSL Configuration Details

### Connection String Requirements

- **Host**: Use Session Pooler (`*.pooler.supabase.com:6543`)
- **SSL Mode**: `sslmode=verify-full` (not `require`)
- **Port**: 6543 (Session Pooler) not 5432 (Direct)

### Node.js SSL Configuration

The script automatically detects SSL configuration:

1. **SUPABASE_CA_PEM** environment variable (preferred)
2. **supabase-ca.pem** file in project root
3. **Fallback**: Insecure mode with warning (development only)

### Security Levels

- ✅ **Production**: `rejectUnauthorized: true` + CA certificate
- ⚠️ **Development**: `rejectUnauthorized: false` + warning
- ❌ **Never**: `NODE_TLS_REJECT_UNAUTHORIZED=0`

## Troubleshooting

### Common Issues

1. **"self-signed certificate in certificate chain"**
   - Solution: Download and configure Supabase CA certificate

2. **"hostname/IP does not match certificate"**
   - Solution: Use Session Pooler URL, not direct connection

3. **"connection refused"**
   - Solution: Check port (6543 for Session Pooler, 5432 for direct)

4. **"SSL connection required"**
   - Solution: Ensure `sslmode=verify-full` in connection string

### Debug Commands

```bash
# Test SSL connection
openssl s_client -connect aws-1-us-east-2.pooler.supabase.com:6543 -servername aws-1-us-east-2.pooler.supabase.com

# Verify certificate
openssl x509 -in supabase-ca.pem -text -noout

# Test with psql
psql "sslmode=verify-full sslrootcert=./supabase-ca.pem host=aws-1-us-east-2.pooler.supabase.com port=6543 dbname=postgres user=postgres.xxx"
```

## Performance Expectations

With secure SSL configuration:

- **Total Runtime**: 60-90 seconds
- **Staged Rows**: ~110,000
- **Cards Updated**: ~90,000
- **History Upserts**: ~136,000

## Security Benefits

- ✅ Full certificate verification
- ✅ No insecure SSL bypasses
- ✅ Production-ready security
- ✅ Audit logging with SSL status
- ✅ Session Pooler optimization

## References

- [Supabase SSL Documentation](https://supabase.com/docs/guides/database/connecting-to-postgres#ssl-certificates)
- [Node.js SSL Configuration](https://node-postgres.com/features/ssl)
- [Session Pooler vs Direct Connection](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooling)
