BEGIN;

UPDATE nazareth.promotions pr
SET status = CASE WHEN p.retired_at IS NOT NULL THEN 'finished' ELSE 'paused' END
FROM nazareth.products p
WHERE p.id = pr.product_id
  AND ((p.retired_at IS NOT NULL AND pr.status <> 'finished')
    OR (p.archived_at IS NOT NULL AND pr.status IN ('active', 'scheduled')));

COMMIT;
