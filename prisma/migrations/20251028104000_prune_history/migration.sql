-- Migration: Prune price history and optimize storage
-- Keeps last 30 days of data and sets up daily pruning

-- Optional backup (controlled by DO block)
DO $$
BEGIN
  -- Check if backup is enabled via environment
  IF current_setting('app.settings.backup_enabled', TRUE) = 'true' THEN
    -- Create backup table
    CREATE TABLE IF NOT EXISTS public.mtgcard_price_history_backup (LIKE public.mtgcard_price_history INCLUDING ALL);
    
    -- Copy only data older than 30 days to save space
    INSERT INTO public.mtgcard_price_history_backup
    SELECT * FROM public.mtgcard_price_history
    WHERE price_at < NOW() - INTERVAL '30 days';
    
    RAISE NOTICE 'Backup created with % rows', (SELECT COUNT(*) FROM public.mtgcard_price_history_backup);
  END IF;
END $$;

-- Log table stats before changes
DO $$
DECLARE
  v_total_rows BIGINT;
  v_old_rows BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total_rows FROM public.mtgcard_price_history;
  SELECT COUNT(*) INTO v_old_rows FROM public.mtgcard_price_history
  WHERE price_at < NOW() - INTERVAL '30 days';
  
  RAISE NOTICE 'Before pruning: % total rows, % rows older than 30 days', v_total_rows, v_old_rows;
END $$;

-- Chunked deletion of old data
DO $$
DECLARE
  v_rows BIGINT;
  v_total_deleted BIGINT := 0;
BEGIN
  LOOP
    WITH cte AS (
      SELECT id
      FROM public.mtgcard_price_history
      WHERE price_at < NOW() - INTERVAL '30 days'
      LIMIT 200000
      FOR UPDATE SKIP LOCKED
    )
    DELETE FROM public.mtgcard_price_history ph
    USING cte
    WHERE ph.id = cte.id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_total_deleted := v_total_deleted + v_rows;
    
    EXIT WHEN v_rows = 0;
    RAISE NOTICE 'Deleted % rows (total: %)', v_rows, v_total_deleted;
    PERFORM pg_sleep(0.05); -- Reduce system load
  END LOOP;
END $$;

-- Create new efficient indexes
CREATE INDEX IF NOT EXISTS mtgcard_price_history_price_at_brin
  ON public.mtgcard_price_history USING BRIN (price_at);

CREATE INDEX IF NOT EXISTS mtgcard_price_history_scryfall_id_idx
  ON public.mtgcard_price_history (scryfall_id);

-- Drop old composite index (after new ones are created)
DROP INDEX IF EXISTS public.ix_price_hist_card_time;

-- Reindex to optimize storage
REINDEX TABLE public.mtgcard_price_history;

-- Post-cleanup stats maintenance
-- Note: VACUUM cannot run inside a transaction block (Prisma wraps migrations in a tx).
-- We run ANALYZE here to update planner stats; rely on autovacuum for space reclaim,
-- or run VACUUM FULL manually/with cron if VACUUM_FULL=true (see README).
ANALYZE public.mtgcard_price_history;

-- Create pruning function
CREATE OR REPLACE FUNCTION public.prune_mtg_price_history_30d()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_rows BIGINT;
  v_total_deleted BIGINT := 0;
BEGIN
  RAISE NOTICE 'Starting daily price history pruning...';
  
  LOOP
    WITH cte AS (
      SELECT id
      FROM public.mtgcard_price_history
      WHERE price_at < NOW() - INTERVAL '30 days'
      LIMIT 200000
      FOR UPDATE SKIP LOCKED
    )
    DELETE FROM public.mtgcard_price_history ph
    USING cte
    WHERE ph.id = cte.id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_total_deleted := v_total_deleted + v_rows;
    
    EXIT WHEN v_rows = 0;
    RAISE NOTICE 'Deleted % rows (total: %)', v_rows, v_total_deleted;
    PERFORM pg_sleep(0.05);
  END LOOP;

  RAISE NOTICE 'Pruning complete. Total rows deleted: %', v_total_deleted;
  
  -- Optional stats reset
  IF v_total_deleted > 0 THEN
    VACUUM (ANALYZE) public.mtgcard_price_history;
  END IF;
END $$;

-- Set up pg_cron job (if extension available)
DO $$
BEGIN
  -- Check if pg_cron extension exists
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Create extension in case it's not created
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    
    -- Schedule daily pruning at 03:00 (idempotent)
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune-mtg-price-history-30d') THEN
      PERFORM cron.unschedule('prune-mtg-price-history-30d');
    END IF;
    PERFORM cron.schedule(
      'prune-mtg-price-history-30d',
      '0 3 * * *',
      'SELECT public.prune_mtg_price_history_30d()'
    );
    
    RAISE NOTICE 'Scheduled daily pruning job at 03:00';
  ELSE
    RAISE NOTICE 'pg_cron extension not available - skipping job creation';
  END IF;
END $$;
