BEGIN;

-- Permite registrar teléfonos de administradores; los clientes siguen utilizando customers.phone.
ALTER TABLE nazareth.profiles ADD COLUMN IF NOT EXISTS phone text;
GRANT SELECT (phone), INSERT (phone), UPDATE (phone) ON nazareth.profiles TO nazareth_app;

COMMIT;
