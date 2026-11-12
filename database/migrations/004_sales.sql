BEGIN;

ALTER TABLE nazareth.sales
  ADD COLUMN subtotal_amount numeric(12,2),
  ADD COLUMN discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN cash_received numeric(12,2),
  ADD COLUMN change_amount numeric(12,2),
  ADD COLUMN request_id uuid,
  ADD COLUMN request_fingerprint text;

ALTER TABLE nazareth.sales ADD CONSTRAINT sales_amounts_valid CHECK (
  discount_amount >= 0 AND
  (subtotal_amount IS NULL OR (subtotal_amount >= discount_amount AND total_amount = subtotal_amount - discount_amount)) AND
  (cash_received IS NULL OR cash_received >= total_amount) AND
  (change_amount IS NULL OR (cash_received IS NOT NULL AND change_amount = cash_received - total_amount AND change_amount >= 0))
);
CREATE UNIQUE INDEX sales_request_id_idx ON nazareth.sales (request_id) WHERE request_id IS NOT NULL;

ALTER TABLE nazareth.sale_items ADD COLUMN product_name text, ADD COLUMN product_unit text;

GRANT SELECT ON nazareth.sale_items TO nazareth_app;
GRANT SELECT (id, user_id, name, phone) ON nazareth.customers TO nazareth_app;

COMMIT;
