BEGIN;

ALTER TABLE nazareth.products
  ADD COLUMN IF NOT EXISTS archived_at timestamptz CHECK (archived_at IS NULL OR NOT is_active);
ALTER TABLE nazareth.profiles
  ADD COLUMN IF NOT EXISTS access_removed_at timestamptz CHECK (access_removed_at IS NULL OR (role = 'client' AND NOT is_active));

CREATE OR REPLACE VIEW nazareth.account_directory AS
SELECT p.id, p.auth_user_id, p.name, u.email, p.role, p.is_active, p.is_protected, p.created_at, p.access_removed_at
FROM nazareth.profiles AS p
JOIN auth.users AS u ON u.id = p.auth_user_id;

GRANT UPDATE (archived_at) ON nazareth.products TO nazareth_app;
GRANT DELETE ON nazareth.products TO nazareth_app;
GRANT UPDATE (access_removed_at) ON nazareth.profiles TO nazareth_app;

COMMIT;
