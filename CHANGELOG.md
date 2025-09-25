# Changelog

## v0.3.0 — 2025-09-25
### Features
- Marketplace-style filter UX with horizontal chip bar and facet popovers (Sets, Rarity, Printings)
- Multi-select facets with live counts and URL-sync; instant results update
- Sets facet shows full set names; options hidden when count is zero
- Numbered pagination (compact with ellipsis), accessible and branded
- Search API: multi-select `set` support (`?set=AAA&set=BBB`), richer grouped results
- Search index: support “Shattered Glass” variant

### Fixes
- Facet overlays no longer push layout; only one facet open at a time; reliable outside-click/Escape to close
- Image fallback added for broken thumbnails
- Search SQL: ensure `rarity` available in lateral selection; remove results without backing card rows

### Performance
- Next/Image sizing and intrinsic ratios to reduce CLS; lazy-loaded thumbs
- Prefetch next page link for snappier pagination

### Refactors / Chore / Docs
- Removed “All Filters” and grouping checkbox; simplified UI
- Consolidated pagination controls and reduced vertical spacing
- Rounded, token-aligned chips and popover components
- Release plumbing and safeguards for meaningful tags

Changes to pricing display:
- Prices are now whole-dollar (rounded up) across grid and printing detail pages, with fallback order Etched → Foil → Normal.

## v0.2.0 — 2025-09-25
### Features
- ui: product-style card page layout with sticky image column and 63:88 aspect; compact header with left title and inline search (0041fa4)
- search: grouped results, pagination (25/page), price display; render (Borderless) instead of (Full Art) across UI (0041fa4)

### Performance
- image: Next/Image size hints and aspect wrappers to prevent CLS (0041fa4)

### Refactors / Chore / Docs
- card-page: reuse SearchResultsGrid to unify card listing UI (0041fa4)
- cleanup: remove dead code and unused imports; normalize formatting (no behavior change) (7d717ae)

## v0.1.2 — 2025-09-24
- chore(release): bump version and update changelog

## v0.1.1 — 2025-09-24
- Search: canonical printing routing `/mtg/printing/[printingId]`, robust data fetch, and breadcrumb.
- SearchBox: printing links with guards and dev fallback; grouped card links; tokenized UI.
- Indexing: ensured docs have `id` = scryfallId; rebuild/audit scripts added.
- Theming: semantic tokens, pre-paint init, ThemeToggle; tokenized tables/buttons/inputs.
- Config: redirect legacy pretty route to canonical; health endpoint.
- UI: printing detail page, oracle page tweaks, image component to enforce 3:4 aspect.
