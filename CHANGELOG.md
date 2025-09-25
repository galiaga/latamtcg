# Changelog

## v0.2.0 — 2025-09-25
- Search
  - Paginated results (25/page); numbered pagination with mobile-compact controls.
  - Grouping updated to TCGplayer-like model: separate items per `(oracleId, setCode, collectorNumber, variant, finishGroup)`.
  - Collapsed standard Nonfoil/Foil into “Standard”; special foils and frame variants remain distinct.
  - Exact matching when quoted or `exact=1`.
  - Title normalization: “(Full Art)” rendered as “(Borderless)”.
  - Pricing filter: exclude printings without price; surface `priceUsd` or fallback to `priceUsdFoil`.
  - Structured request logging with latency and slow warnings.
- Autocomplete
  - Uses search endpoint with pageSize=10; shows variant/finish suffixes.
- Printing page
  - “See other printings” uses same grouping (EN-only), capped visually to 30, excludes items without price.
  - Price display falls back to foil when nonfoil absent; hides page if no price available.
- Indexing
  - Enhanced taxonomy for `finishLabel` (Foil Etched, Gilded, Halo, Textured, Rainbow, Step-and-Compleat) and `variantLabel` (Borderless, Extended Art, Showcase, Retro, Full Art).
  - Rebuild scripts updated; counts audited.
- Fixes
  - Resolved Postgres 42703 errors by aliasing quoted columns in raw SQL CTEs.
  - Ensured counts match grid by aligning grouping and filters.

## v0.1.2 — 2025-09-24
- chore(release): bump version and update changelog

## v0.1.1 — 2025-09-24
- Search: canonical printing routing `/mtg/printing/[printingId]`, robust data fetch, and breadcrumb.
- SearchBox: printing links with guards and dev fallback; grouped card links; tokenized UI.
- Indexing: ensured docs have `id` = scryfallId; rebuild/audit scripts added.
- Theming: semantic tokens, pre-paint init, ThemeToggle; tokenized tables/buttons/inputs.
- Config: redirect legacy pretty route to canonical; health endpoint.
- UI: printing detail page, oracle page tweaks, image component to enforce 3:4 aspect.
