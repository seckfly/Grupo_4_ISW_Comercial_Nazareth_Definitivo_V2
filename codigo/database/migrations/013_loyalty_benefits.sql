BEGIN;

CREATE TABLE IF NOT EXISTS nazareth.loyalty_benefits (
  id uuid PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES nazareth.customers(id),
  points_cost integer NOT NULL CHECK (points_cost > 0),
  discount_amount numeric(12, 2) NOT NULL CHECK (discount_amount > 0),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  sale_id integer UNIQUE REFERENCES nazareth.sales(id),
  CHECK (cancelled_at IS NULL OR sale_id IS NULL)
);

CREATE INDEX IF NOT EXISTS loyalty_benefits_customer_idx
  ON nazareth.loyalty_benefits(customer_id, claimed_at DESC);

REVOKE ALL ON nazareth.loyalty_benefits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON nazareth.loyalty_benefits TO nazareth_app;
GRANT UPDATE (cancelled_at, sale_id) ON nazareth.loyalty_benefits TO nazareth_app;

COMMIT;
