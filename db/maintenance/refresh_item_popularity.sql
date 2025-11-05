-- Refresh item popularity materialized view
-- This script should be run every 15 minutes via cron job
-- Can be run concurrently to avoid blocking reads

REFRESH MATERIALIZED VIEW CONCURRENTLY public.item_popularity_mv;

-- Log refresh completion
DO $$
DECLARE
  v_row_count BIGINT;
  v_max_score NUMERIC;
BEGIN
  SELECT COUNT(*), MAX(popularity_score)
  INTO v_row_count, v_max_score
  FROM public.item_popularity_mv;
  
  RAISE NOTICE 'Popularity MV refreshed: % rows, max score: %', v_row_count, v_max_score;
END $$;

