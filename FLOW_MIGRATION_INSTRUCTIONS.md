# Flow Payment Migration Instructions

The migration file has been created at:
`prisma/migrations/20251105145226_add_flow_payment_fields/migration.sql`

## Option 1: Apply via Prisma (Recommended if shadow DB issue is resolved)

```bash
# If shadow database is working:
npm run db:migrate:dev

# Or mark as applied and apply manually:
npx prisma migrate resolve --applied 20251105145226_add_flow_payment_fields
```

## Option 2: Apply directly via SQL (Bypass shadow DB)

You can apply the migration directly using one of these methods:

### Via Supabase Dashboard:
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Copy and paste the contents of `prisma/migrations/20251105145226_add_flow_payment_fields/migration.sql`
4. Run the SQL

### Via psql:
```bash
psql "$DATABASE_URL" -f prisma/migrations/20251105145226_add_flow_payment_fields/migration.sql
```

### Via Prisma Studio (if available):
```bash
npx prisma studio
# Then run the SQL manually
```

## Option 3: Use `prisma db push` (Development only)

This applies schema changes without creating a migration history entry:

```bash
npx prisma db push
```

⚠️ **Warning**: `db push` doesn't create a migration record. Use only for development.

## Option 4: Fix Shadow Database Issue

The shadow database error suggests the `SearchIndex` table doesn't exist in the shadow DB. To fix:

1. Check if SearchIndex migration exists and is applied
2. Ensure all previous migrations are applied to the main database
3. Try resetting the shadow database:
   ```bash
   npx prisma migrate reset --skip-seed
   ```

## After Migration

Once the migration is applied:

1. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```

2. Verify the schema:
   ```bash
   npx prisma validate
   ```

3. Test the Flow payment flow locally

## Verification

Check that the migration was applied:

```sql
-- Check OrderStatus enum exists
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'OrderStatus'::regtype;

-- Check Order table has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Order' 
AND column_name IN ('amountCLP', 'flowToken', 'flowOrder', 'flowPaymentId', 'paidAt', 'metadata', 'status');

-- Check PaymentLog table exists
SELECT COUNT(*) FROM "PaymentLog";
```

