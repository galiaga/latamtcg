-- Disable pruning cron/function if present (safe, idempotent)
DO $$
DECLARE has_cron boolean;
BEGIN
  -- Only try to unschedule if the cron schema exists
  SELECT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'cron'
  ) INTO has_cron;

  IF has_cron THEN
    BEGIN
      PERFORM cron.unschedule('prune-mtg-price-history-30d');
    EXCEPTION WHEN undefined_function THEN
      -- cron extension present but function missing; ignore
      NULL;
    END;
  END IF;

  -- Function drop is already guarded by IF EXISTS
  DROP FUNCTION IF EXISTS public.prune_mtg_price_history_30d() CASCADE;
END $$;


