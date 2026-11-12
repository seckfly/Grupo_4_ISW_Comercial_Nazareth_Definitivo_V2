BEGIN;
CREATE TABLE IF NOT EXISTS nazareth.promotion_creation_requests (
  request_id uuid PRIMARY KEY,
  fingerprint text NOT NULL,
  promotion_id integer NOT NULL
);

-- Keep the original receipt even if the campaign is later deleted.
ALTER TABLE nazareth.promotion_creation_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON nazareth.promotion_creation_requests FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON nazareth.promotion_creation_requests TO nazareth_app;

DROP POLICY IF EXISTS promotion_requests_backend_read ON nazareth.promotion_creation_requests;
CREATE POLICY promotion_requests_backend_read ON nazareth.promotion_creation_requests
  FOR SELECT TO nazareth_app USING (true);

DROP POLICY IF EXISTS promotion_requests_backend_insert ON nazareth.promotion_creation_requests;
CREATE POLICY promotion_requests_backend_insert ON nazareth.promotion_creation_requests
  FOR INSERT TO nazareth_app WITH CHECK (true);
COMMIT;
