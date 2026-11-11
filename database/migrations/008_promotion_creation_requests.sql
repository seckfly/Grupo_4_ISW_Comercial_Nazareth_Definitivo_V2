BEGIN;
CREATE TABLE IF NOT EXISTS nazareth.promotion_creation_requests (
  request_id uuid PRIMARY KEY,
  fingerprint text NOT NULL,
  promotion_id integer NOT NULL
);
-- Keep the original receipt even if the campaign is later deleted.
GRANT SELECT, INSERT ON nazareth.promotion_creation_requests TO nazareth_app;
COMMIT;
