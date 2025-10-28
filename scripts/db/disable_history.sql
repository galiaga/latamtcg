-- Disable pruning cron/function if present (safe, idempotent)
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('prune-mtg-price-history-30d');
  EXCEPTION WHEN undefined_function THEN
    -- pg_cron not installed or not available; ignore
    NULL;
  END;

  BEGIN
    DROP FUNCTION IF EXISTS public.prune_mtg_price_history_30d() CASCADE;
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;
END $$;


