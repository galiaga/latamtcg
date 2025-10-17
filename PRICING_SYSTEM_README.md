# Pricing System Implementation

This document describes the pricing system implementation for LatamTCG.

## Overview

The pricing system switches display pricing from USD to CLP for Chile with configurable parameters. It implements:

- CLP pricing with tiered markup and rounding
- Per-card minimum pricing
- Order minimum validation
- Flat shipping with optional free shipping threshold
- Private admin interface for configuration

## Formula

```
FinalPriceCLP = ceil_to_step(
  max(priceMinPerCardClp, (TCGPriceUSD * FX_CLP * (1 + alpha)) + betaClp),
  roundToStepClp
)
```

Where:
- `alpha`: tiered markup based on USD price
- `betaClp`: daily shipping proration per card
- `priceMinPerCardClp`: minimum price per card (500 CLP default)
- `roundToStepClp`: rounding step (500 CLP default)

## Alpha Tiers (Default)

- < 5 USD → alpha = 0.90
- 5–20 USD → alpha = 0.70  
- > 20 USD → alpha = 0.50

## Checkout Rules

- Order minimum: 10,000 CLP
- Flat shipping: 2,500 CLP
- Free shipping threshold: 25,000 CLP (optional)

## Database Models

### PricingConfig
Singleton configuration model with all pricing parameters.

### DailyShipping
Daily shipping records for beta calculation.

### MtgCard
Added `computedPriceClp` field for cached CLP prices.

## API Routes

- `GET /api/pricing/preview?tcgUsd=X` - Preview pricing calculation
- `GET /api/admin/pricing/config` - Get configuration
- `POST /api/admin/pricing/config` - Update configuration
- `GET /api/admin/pricing/daily-shipping` - Get shipping records
- `POST /api/admin/pricing/daily-shipping` - Add shipping record
- `POST /api/admin/reprice` - Recalculate all card prices

## Frontend Changes

### Components Updated
- `CardTile`: Now displays CLP prices with tooltip
- `CartPage`: Implements minimum order validation and shipping calculation
- `PricingProvider`: Context for pricing configuration

### Currency Formatting
- `formatCLP()`: Chilean peso formatting with es-CL locale
- `formatUsd()`: Existing USD formatting

## Admin Interface

Access at `/admin/pricing` with admin token authentication.

Features:
- Configuration management
- Daily shipping input
- Pricing preview
- Bulk repricing
- Overview dashboard

## Setup Instructions

1. Run Prisma migration:
   ```bash
   npx prisma migrate dev --name pricing_system_models
   ```

2. Seed default configuration:
   ```bash
   tsx scripts/seed-pricing-config.ts
   ```

3. Set admin token environment variable:
   ```bash
   export ADMIN_TOKEN=your-secure-token
   ```

## Environment Variables

- `ADMIN_TOKEN`: Required for admin API access
- `DATABASE_URL`: Database connection string

## Testing

The system maintains backward compatibility:
- USD prices remain intact in database
- CLP prices computed separately
- Existing search, filters, and cart functionality preserved
- Graceful fallback to USD if CLP disabled

## Notes

- CLP prices are cached in `computedPriceClp` field for performance
- Nightly repricing recommended via cron job calling `/api/admin/reprice`
- All parameters configurable through admin interface
- Progress banners guide users to minimum order and free shipping thresholds
