BEGIN;

-- La cuenta protegida no puede marcarse para eliminación; los otros admins sí.
ALTER TABLE nazareth.profiles
  DROP CONSTRAINT IF EXISTS profiles_access_removed_at_check;
ALTER TABLE nazareth.profiles
  ADD CONSTRAINT profiles_access_removed_at_check
    CHECK (access_removed_at IS NULL OR (NOT is_active AND NOT is_protected));

-- Conserva referencias comerciales pero permite retirar datos personales al eliminar la cuenta.
GRANT UPDATE (name) ON nazareth.customers TO nazareth_app;

COMMIT;
