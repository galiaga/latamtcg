# Pricing System Setup Guide

This guide will help you set up the new pricing system for LatamTCG.

## Prerequisites

- Node.js and npm installed
- Database access (Supabase PostgreSQL)
- Admin token for configuration

## Step 1: Database Migration

When your database is available, run the migration to create the new pricing models:

```bash
# Run the migration to create PricingConfig and DailyShipping tables
npm run db:migrate:dev -- --name pricing_system_models

# Or if you prefer to use the direct command:
npx prisma migrate dev --name pricing_system_models
```

## Step 2: Seed Default Configuration

After the migration is complete, seed the default pricing configuration:

```bash
npm run db:seed:pricing
```

This will create a default PricingConfig with:
- CLP pricing enabled
- FX rate: 950 CLP/USD
- Alpha tiers: <5 USD (0.9), 5-20 USD (0.7), >20 USD (0.5)
- Minimum per card: 500 CLP
- Rounding step: 500 CLP
- Order minimum: 10,000 CLP
- Flat shipping: 2,500 CLP
- Free shipping threshold: 25,000 CLP

## Step 3: Set Admin Token

Set your admin token environment variable:

```bash
# Add to your .env file
ADMIN_TOKEN=your-secure-admin-token-here
```

## Step 4: Generate Prisma Client

Ensure the Prisma client is up to date:

```bash
npx prisma generate
```

## Step 5: Test the System

Run the pricing tests to verify everything works:

```bash
npm test src/lib/__tests__/pricing.spec.ts
```

## Step 6: Access Admin Interface

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/admin/pricing`
3. Enter your admin token
4. Configure pricing parameters as needed

## Step 7: Bulk Repricing (Optional)

If you have existing cards, you may want to recalculate all CLP prices:

1. Go to the admin interface
2. Click "Reprice All Cards" button
3. This will update the `computedPriceClp` field for all cards with USD prices

## Verification Checklist

- [ ] Database migration completed successfully
- [ ] Default PricingConfig created
- [ ] Admin token set in environment
- [ ] Prisma client generated
- [ ] Pricing tests pass
- [ ] Admin interface accessible
- [ ] Card prices display in CLP
- [ ] Cart shows minimum order validation
- [ ] Shipping calculation works
- [ ] Progress banners display correctly

## Troubleshooting

### Database Connection Issues
If you get database connection errors:
1. Check your `.env` file has correct `DATABASE_URL`
2. Ensure your Supabase project is running
3. Verify network connectivity

### Migration Errors
If migration fails:
1. Check database permissions
2. Ensure no conflicting migrations
3. Try running `npx prisma migrate reset` (⚠️ This will delete all data)

### Admin Access Issues
If admin interface doesn't work:
1. Verify `ADMIN_TOKEN` is set correctly
2. Check browser console for errors
3. Ensure API routes are accessible

### Pricing Display Issues
If prices don't show in CLP:
1. Check PricingConfig.useCLP is true
2. Verify computedPriceClp field has values
3. Run bulk repricing if needed

## Production Deployment

For production deployment:

1. Run production migration:
   ```bash
   npm run db:migrate
   ```

2. Set production admin token in your deployment environment

3. Consider setting up a cron job for nightly repricing:
   ```bash
   # Example cron job (runs daily at 2 AM)
   0 2 * * * curl -X POST https://your-domain.com/api/admin/reprice -H "x-admin-token: your-token"
   ```

## Configuration Reference

### PricingConfig Fields
- `useCLP`: Enable/disable CLP pricing
- `fxClp`: Exchange rate (CLP per USD)
- `alphaTierLowUsd`: Low tier threshold
- `alphaTierMidUsd`: Mid tier threshold
- `alphaLow`: Low tier markup (0.9 = 90%)
- `alphaMid`: Mid tier markup (0.7 = 70%)
- `alphaHigh`: High tier markup (0.5 = 50%)
- `priceMinPerCardClp`: Minimum price per card
- `roundToStepClp`: Rounding step size
- `minOrderSubtotalClp`: Minimum order total
- `shippingFlatClp`: Flat shipping cost
- `freeShippingThresholdClp`: Free shipping threshold (null = disabled)

### DailyShipping Fields
- `date`: Date of shipping
- `totalShippingUsd`: Total shipping cost in USD
- `cardsCount`: Number of cards shipped
- `notes`: Optional notes

## Support

If you encounter issues:
1. Check the console logs for errors
2. Verify all environment variables are set
3. Ensure database connectivity
4. Review the PRICING_SYSTEM_README.md for detailed technical information
