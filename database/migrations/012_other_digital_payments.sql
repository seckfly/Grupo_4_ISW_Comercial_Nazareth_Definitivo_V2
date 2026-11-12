BEGIN;

ALTER TABLE nazareth.sales
  DROP CONSTRAINT IF EXISTS sales_payment_method_check,
  ADD CONSTRAINT sales_payment_method_check
    CHECK (payment_method IN ('efectivo', 'yape', 'plin', 'otro_digital'));

COMMIT;
