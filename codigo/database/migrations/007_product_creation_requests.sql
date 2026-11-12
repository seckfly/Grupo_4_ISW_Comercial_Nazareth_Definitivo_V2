BEGIN;
ALTER TABLE nazareth.products
  ADD COLUMN IF NOT EXISTS creation_request_id uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS creation_request_fingerprint text;

GRANT INSERT (creation_request_id, creation_request_fingerprint)
  ON nazareth.products TO nazareth_app;
COMMIT;
