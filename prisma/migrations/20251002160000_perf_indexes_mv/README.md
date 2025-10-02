SQL changes proposed for performance (run via a manual migration):

-- Cart hot paths
CREATE INDEX IF NOT EXISTS idx_cart_user_checkedout ON "Cart" ("userId", "checkedOutAt");
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON "CartItem" ("cartId");
CREATE INDEX IF NOT EXISTS idx_cart_items_printing ON "CartItem" ("printingId");

-- Search facets MV (optional; refresh on schedule)
-- CREATE MATERIALIZED VIEW IF NOT EXISTS search_facets_mv AS
-- SELECT upper(si."setCode") AS code,
--        COALESCE(si."setName", s.set_name) AS name,
--        mc.rarity AS rarity,
--        (CASE WHEN mc.finishes @> ARRAY['nonfoil']::text[] THEN true ELSE false END) AS has_nonfoil,
--        (CASE WHEN mc.finishes @> ARRAY['foil']::text[] THEN true ELSE false END) AS has_foil,
--        (CASE WHEN mc.finishes @> ARRAY['etched']::text[] THEN true ELSE false END) AS has_etched,
--        COUNT(*) AS cnt
-- FROM "SearchIndex" si
-- JOIN "MtgCard" mc ON mc."scryfallId" = si.id
-- LEFT JOIN "Set" s ON upper(s.set_code) = upper(si."setCode")
-- WHERE si.game = 'mtg' AND si."isPaper" = true
-- GROUP BY code, name, rarity, has_nonfoil, has_foil, has_etched;
-- CREATE INDEX IF NOT EXISTS idx_search_facets_code ON search_facets_mv (code);
-- CREATE INDEX IF NOT EXISTS idx_search_facets_rarity ON search_facets_mv (rarity);


