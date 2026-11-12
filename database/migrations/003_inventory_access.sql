BEGIN;

-- Reutiliza las categorías de la pantalla original en instalaciones sin catálogo.
INSERT INTO nazareth.categories (name)
VALUES ('Abarrotes'), ('Bebidas'), ('Limpieza'), ('Lácteos'), ('Conservas')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE nazareth.inventory_movements ADD COLUMN adjustment_request_id uuid;
ALTER TABLE nazareth.inventory_movements ADD CONSTRAINT inventory_adjustment_request_type
  CHECK (adjustment_request_id IS NULL OR type = 'adjustment');
CREATE UNIQUE INDEX inventory_adjustment_request_id_idx
  ON nazareth.inventory_movements (adjustment_request_id)
  WHERE adjustment_request_id IS NOT NULL;

GRANT INSERT (category_id, name, unit, cost_price, sale_price, current_stock, min_stock_threshold, is_active)
  ON nazareth.products TO nazareth_app;
GRANT UPDATE (category_id, name, unit, cost_price, sale_price, min_stock_threshold, is_active)
  ON nazareth.products TO nazareth_app;
GRANT USAGE ON SEQUENCE nazareth.products_id_seq TO nazareth_app;
GRANT SELECT ON nazareth.inventory_movements TO nazareth_app;

COMMIT;
