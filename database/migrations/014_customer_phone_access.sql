BEGIN;

-- El número telefónico se guarda en la ficha de cliente; no es obligatorio.
GRANT INSERT (phone), UPDATE (phone) ON nazareth.customers TO nazareth_app;

COMMIT;
