# Changelog

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
