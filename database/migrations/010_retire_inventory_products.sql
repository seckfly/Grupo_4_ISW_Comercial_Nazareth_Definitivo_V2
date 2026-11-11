BEGIN;

ALTER TABLE nazareth.products
  ADD COLUMN IF NOT EXISTS retired_at timestamptz
    CHECK (retired_at IS NULL OR (NOT is_active AND current_stock = 0 AND archived_at IS NULL));

GRANT UPDATE (retired_at) ON nazareth.products TO nazareth_app;
REVOKE DELETE ON nazareth.products FROM nazareth_app;

COMMIT;
