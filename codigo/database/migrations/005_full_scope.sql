BEGIN;
-- Additive: preserve sales, references, customer associations and stock history.
ALTER TABLE nazareth.reservations ADD COLUMN request_id uuid,
  ADD COLUMN request_fingerprint text,
  ADD COLUMN confirmed_at timestamptz;
CREATE UNIQUE INDEX reservations_request_id_idx ON nazareth.reservations(request_id) WHERE request_id IS NOT NULL;
ALTER TABLE nazareth.reservations ADD CONSTRAINT reservation_status_valid CHECK
  (status IN ('pending','confirmed','cancelled','rejected','expired','collected')) NOT VALID;
ALTER TABLE nazareth.sales ADD COLUMN reservation_id integer REFERENCES nazareth.reservations(id),
  ADD COLUMN digital_received numeric(12,2) CHECK (digital_received IS NULL OR digital_received >= 0);
CREATE UNIQUE INDEX sales_reservation_idx ON nazareth.sales(reservation_id) WHERE reservation_id IS NOT NULL;
CREATE INDEX reservation_holds_idx ON nazareth.reservations(status,pickup_deadline);
GRANT SELECT, INSERT, UPDATE ON nazareth.reservations, nazareth.reservation_items,
  nazareth.purchase_orders, nazareth.purchase_order_items, nazareth.receipts, nazareth.receipt_items,
  nazareth.customer_favorites, nazareth.product_lists, nazareth.product_list_items TO nazareth_app;
GRANT DELETE ON nazareth.reservation_items, nazareth.customer_favorites, nazareth.product_list_items TO nazareth_app;
GRANT SELECT ON nazareth.customers, nazareth.sale_items, nazareth.inventory_movements TO nazareth_app;
GRANT UPDATE (image_url) ON nazareth.products TO nazareth_app;
GRANT INSERT (image_url) ON nazareth.products TO nazareth_app;
GRANT UPDATE (reservation_id,digital_received) ON nazareth.sales TO nazareth_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA nazareth TO nazareth_app;
COMMIT;
