# Vercel Environment Variables Setup for Paper-Only Mode

## Required Environment Variables for PROD

Set these environment variables in your Vercel project dashboard (Settings > Environment Variables) or via CLI:

### Core Configuration
```bash
SCRYFALL_BULK_DATASET=default_cards
SCRYFALL_FILTER_PAPER_ONLY=true
```

### JSON Parse Mode (Optional)
```bash
# Default: stream (use streaming parser)
SCRYFALL_JSON_PARSE_MODE=stream

# Alternative: buffer (use full-buffer parser for paper-only mode)
SCRYFALL_JSON_PARSE_MODE=buffer
```

### Fallback Control (Optional)
```bash
# Force buffer mode fallback when streaming stalls (only for paper-only mode)
SCRYFALL_FORCE_BUFFER_MODE=false
```

## Environment Variable Details

### SCRYFALL_BULK_DATASET
- **Value**: `default_cards` (recommended) or `unique_prints`
- **Purpose**: Determines which Scryfall bulk dataset to use
- **Default**: `default_cards`

### SCRYFALL_FILTER_PAPER_ONLY
- **Value**: `true` (enables paper-only filtering)
- **Purpose**: Filters out digital-only cards, keeping only paper cards
- **Default**: `false` (no filtering)

### SCRYFALL_JSON_PARSE_MODE
- **Value**: `stream` (default) or `buffer`
- **Purpose**: Controls JSON parsing method
- **Behavior**:
  - `stream`: Uses streaming parser (faster, less memory)
  - `buffer`: Uses full-buffer parser (more reliable for paper-only mode)
- **Default**: `stream`

### SCRYFALL_FORCE_BUFFER_MODE
- **Value**: `true` or `false`
- **Purpose**: Forces buffer mode fallback when streaming stalls
- **Behavior**: Only applies when `SCRYFALL_FILTER_PAPER_ONLY=true` and `SCRYFALL_JSON_PARSE_MODE=stream`
- **Default**: `false`

## Recommended PROD Configuration

For production with paper-only mode enabled:

```bash
SCRYFALL_BULK_DATASET=default_cards
SCRYFALL_FILTER_PAPER_ONLY=true
SCRYFALL_JSON_PARSE_MODE=buffer
```

This configuration:
- Uses the default_cards dataset (most comprehensive)
- Filters to paper-only cards
- Uses buffer parsing for reliability
- Avoids potential streaming stalls

## Setting via Vercel CLI

```bash
# Set environment variables
vercel env add SCRYFALL_BULK_DATASET production
vercel env add SCRYFALL_FILTER_PAPER_ONLY production
vercel env add SCRYFALL_JSON_PARSE_MODE production

# Values to enter when prompted:
# SCRYFALL_BULK_DATASET: default_cards
# SCRYFALL_FILTER_PAPER_ONLY: true
# SCRYFALL_JSON_PARSE_MODE: buffer
```

## Verification

After setting the environment variables, trigger the ingestion:

```bash
# Test the stage ingestion
curl "https://your-app.vercel.app/api/cron/ingest-stage?token=$CRON_SECRET"

# Expected response should include:
# - paperOnly: true
# - parseMode: 'buffer' (if buffer mode used) or 'stream'
# - consistencyRatio ∈ [0.95, 1.05]
# - allowed: true
```

## Monitoring

The ingestion will log:
- `[json-to-csv] Paper-only filter: true`
- `[json-to-csv] JSON parse mode: buffer`
- `[json-to-csv] Using buffer parse mode...` (if buffer mode)
- `[json-to-csv] Fallback to buffer parse due to stall` (if fallback used)
- `[ok] dataset=default_cards, paperOnly=true, parseMode=buffer, fallbackUsed=false, ratio=0.XXX, allowed=true, skipped=false`
