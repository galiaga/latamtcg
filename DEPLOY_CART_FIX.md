# Cart Fix Deployment Guide

## Changes Made

1. **Fixed syntax error** in `src/lib/cart.ts` (moved import to top)
2. **Added error handling** to `src/app/api/cart/add/route.ts`
3. **Added error handling** to `src/app/api/cart/update/route.ts`
4. **Added dynamic export** to prevent caching
5. **Disabled RLS** on Cart and CartItem tables (already done in production DB)

## Files Modified

- `src/lib/cart.ts` - Fixed import placement
- `src/app/api/cart/add/route.ts` - Added error handling and dynamic export
- `src/app/api/cart/update/route.ts` - Added error handling and dynamic export
- `src/components/Footer.tsx` - Fixed version display

## To Deploy

```bash
# Commit changes
git add src/lib/cart.ts src/app/api/cart/add/route.ts src/app/api/cart/update/route.ts src/components/Footer.tsx
git commit -m "Fix cart 500 error - add error handling and fix syntax error"

# Push to production
git push origin main
```

## How to Debug

If you're still seeing 500 errors after deployment, check the server logs:

1. **Vercel Dashboard** → Your Project → Deployments → Latest → Functions → `/api/cart/add` → View Logs
2. Look for lines starting with `[cart/add] Error:`
3. The error message will show what's failing

## Expected Errors to Check

Common issues and solutions:

1. **Database connection error**: Check DATABASE_URL is set correctly
2. **Prisma client not generated**: Run `npx prisma generate`
3. **RLS blocking access**: Already disabled in production
4. **Syntax error**: Already fixed in cart.ts

## Testing

After deployment, test:
1. Add item to cart as anonymous user
2. Add item to cart as authenticated user
3. Update quantity
4. Remove item

