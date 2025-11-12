# Loading System Documentation

This document describes the comprehensive loading system implemented for consistent user feedback during async operations and route transitions.

## Overview

The loading system provides:
- **Global progress indicator** for route transitions and long async actions
- **Context-appropriate skeletons** that match final content layout (no CLS)
- **150ms feedback guarantee** - visual feedback appears within 150ms
- **Accessibility support** with ARIA attributes and reduced motion
- **Ref-counted loading state** to handle multiple concurrent operations

## Architecture

### Core Components

#### `LoadingProvider`
Context provider that manages global loading state using a ref-counting mechanism.

**Location:** `src/components/ui/LoadingProvider.tsx`

**API:**
```tsx
const { loadingCount, startLoading, stopLoading, withLoading, isLoading } = useLoading()
```

- `loadingCount`: Number of active loading operations
- `startLoading()`: Increment loading count
- `stopLoading()`: Decrement loading count
- `withLoading<T>(promise: Promise<T>)`: Wraps a promise to auto-manage loading state
- `isLoading`: Boolean indicating if any loading is active

#### `GlobalProgress`
Top-level progress bar component that integrates with `LoadingProvider` and route changes.

**Location:** `src/components/ui/GlobalProgress.tsx`

Shows a slim progress bar at the top of the page during:
- Route transitions (via pathname changes)
- Any loading state from `LoadingProvider`

### Hooks

#### `useLoading()`
Hook to access loading context.

**Location:** `src/hooks/useLoading.ts`

```tsx
import { useLoading } from '@/hooks/useLoading'

function MyComponent() {
  const { withLoading, isLoading } = useLoading()
  
  const handleSubmit = async () => {
    await withLoading(submitForm())
  }
}
```

#### `useDelayedFlag(delayMs, condition)`
Hook that returns `true` only after a delay if condition is true. Prevents flicker on fast loads while guaranteeing feedback.

**Location:** `src/hooks/useDelayedFlag.ts`

```tsx
import { useDelayedFlag } from '@/hooks/useDelayedFlag'

function MyComponent() {
  const isLoading = useQuery().isLoading
  const showSkeleton = useDelayedFlag(150, isLoading)
  
  return showSkeleton ? <Skeleton /> : <Content />
}
```

## Skeleton Components

### Primitives

All skeleton primitives are located in `src/components/ui/skeletons/`:

- **TextLineSkeleton**: Single line of text
- **AvatarSkeleton**: Circular avatar placeholder
- **CardSkeleton**: Card with aspect ratio (e.g., MTG cards)
- **ListItemSkeleton**: List item with image, text, and actions
- **GridCardSkeleton**: Card tile for grid layouts
- **ImageSkeleton**: Image placeholder with aspect ratio
- **BadgeSkeleton**: Badge/chip placeholder
- **PriceSkeleton**: Price display placeholder
- **ButtonSkeleton**: Button placeholder

### Page-Level Skeletons

- **SearchPageSkeleton**: Search/PLP page with filter bar + grid
- **ProductDetailSkeleton**: PDP with image, title, badges, price, CTA
- **CartPageSkeleton**: Cart with items list, totals, checkout button
- **TablePageSkeleton**: Generic table/list page

### Usage Example

```tsx
import { SearchPageSkeleton } from '@/components/ui/skeletons'
import { useDelayedFlag } from '@/hooks/useDelayedFlag'

export default function SearchPage() {
  const { data, isLoading } = useSearch()
  const showSkeleton = useDelayedFlag(150, isLoading)
  
  if (showSkeleton) {
    return <SearchPageSkeleton />
  }
  
  return <SearchResults data={data} />
}
```

## Integration Patterns

### Route Transitions (App Router)

The `GlobalProgress` component automatically handles route transitions by listening to pathname changes. No additional setup needed.

### Async Operations

Wrap async operations with `withLoading`:

```tsx
const { withLoading } = useLoading()

async function handleCheckout() {
  await withLoading(
    fetch('/api/checkout', { method: 'POST' })
      .then(r => r.json())
  )
}
```

### Data Fetching (SWR/React Query)

For data fetching libraries, use `useDelayedFlag` to show skeletons:

```tsx
function MyComponent() {
  const { data, isLoading } = useSWR('/api/data')
  const showSkeleton = useDelayedFlag(150, isLoading)
  
  if (showSkeleton) return <Skeleton />
  return <Content data={data} />
}
```

### Button Loading States

For inline button loading, use `aria-busy` and `disabled`:

```tsx
<button
  onClick={handleSubmit}
  disabled={isSubmitting}
  aria-busy={isSubmitting}
>
  {isSubmitting ? 'Processing…' : 'Submit'}
</button>
```

## Accessibility

### ARIA Attributes

- **`aria-busy="true"`**: Set on containers while loading
- **`aria-live="polite"`**: Set on containers that will show content (announces when ready)
- **`aria-hidden="true"`**: Set on skeleton elements (they're decorative)
- **`role="status"`**: Optional, for status announcements

### Reduced Motion

The system respects `prefers-reduced-motion`:

- Skeleton animations are disabled (opacity only)
- Transitions are simplified
- No spinning animations for users who prefer reduced motion

## Best Practices

1. **Always use `useDelayedFlag(150, condition)`** to avoid flicker while guaranteeing timely feedback
2. **Match skeleton dimensions** to final content to prevent layout shift (CLS)
3. **Use page-level skeletons** for initial loads, inline loaders for actions
4. **Wrap long operations** with `withLoading` to show global progress
5. **Set `aria-busy` and `aria-live`** on loading containers
6. **Test on slow 3G** to verify skeletons appear and transitions are smooth

## Testing Checklist

- [ ] Global progress bar appears during route changes
- [ ] Skeletons appear within 150ms of loading start
- [ ] Skeletons match final layout (no CLS)
- [ ] Dark mode contrast meets AA standards
- [ ] Reduced motion is respected
- [ ] `withLoading` properly handles errors (calls `stopLoading` on reject)
- [ ] Multiple concurrent operations work correctly (ref-counting)
- [ ] Buttons show inline loading states with `aria-busy`

## Migration Guide

### Replacing Old Spinners

**Before:**
```tsx
{loading && <Spinner />}
```

**After:**
```tsx
const showSkeleton = useDelayedFlag(150, loading)
{showSkeleton && <AppropriateSkeleton />}
```

### Replacing Old ProgressBar

The old `ProgressBar` component has been replaced by `GlobalProgress`. It's automatically integrated in the root layout. No changes needed in individual pages.

### Updating Loading States

**Before:**
```tsx
const [loading, setLoading] = useState(false)
// ... setLoading(true) ... setLoading(false)
```

**After (for global operations):**
```tsx
const { withLoading } = useLoading()
await withLoading(asyncOperation())
```

**After (for local UI):**
```tsx
const [loading, setLoading] = useState(false)
const showSkeleton = useDelayedFlag(150, loading)
```

## File Structure

```
src/
  components/
    ui/
      LoadingProvider.tsx      # Context provider
      GlobalProgress.tsx        # Top progress bar
      skeletons/
        index.ts                # Barrel export
        TextLineSkeleton.tsx
        AvatarSkeleton.tsx
        CardSkeleton.tsx
        ListItemSkeleton.tsx
        GridCardSkeleton.tsx
        ImageSkeleton.tsx
        BadgeSkeleton.tsx
        PriceSkeleton.tsx
        ButtonSkeleton.tsx
        SearchPageSkeleton.tsx
        ProductDetailSkeleton.tsx
        CartPageSkeleton.tsx
        TablePageSkeleton.tsx
  hooks/
    useLoading.ts               # Re-export from LoadingProvider
    useDelayedFlag.ts           # Delayed flag hook
    useRouteTransition.ts       # Route transition hook (optional)
  lib/
    withLoading.ts              # Type-only export (docs)
```

## Examples

See these files for reference implementations:
- `src/components/SearchResultsGrid.tsx` - Search page with skeletons
- `src/app/cart/page.tsx` - Cart page with skeletons
- `src/app/mtg/printing/[printingId]/loading.tsx` - Route-level loading skeleton
- `src/components/AddToCartButton.tsx` - Inline button loading state

