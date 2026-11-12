BEGIN;

CREATE ROLE nazareth_app LOGIN NOINHERIT;

REVOKE ALL ON SCHEMA nazareth FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA nazareth FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA nazareth FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA nazareth TO nazareth_app;

CREATE VIEW nazareth.account_directory AS
SELECT p.id, p.auth_user_id, p.name, u.email, p.role, p.is_active, p.is_protected, p.created_at
FROM nazareth.profiles AS p
JOIN auth.users AS u ON u.id = p.auth_user_id;

CREATE FUNCTION nazareth.session_is_active(session_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.sessions AS session
    WHERE session.id = session_uuid AND session.user_id = user_uuid
      AND (session.not_after IS NULL OR session.not_after > now())
  );
$$;

REVOKE ALL ON nazareth.account_directory FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION nazareth.session_is_active(uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION nazareth.session_is_active(uuid, uuid) TO nazareth_app;

GRANT SELECT ON nazareth.account_directory, nazareth.profiles, nazareth.products,
  nazareth.categories, nazareth.sales, nazareth.promotions TO nazareth_app;
GRANT INSERT (auth_user_id, name, role) ON nazareth.profiles TO nazareth_app;
GRANT UPDATE (name, role, is_active) ON nazareth.profiles TO nazareth_app;
GRANT INSERT (user_id, name) ON nazareth.customers TO nazareth_app;
GRANT SELECT (user_id) ON nazareth.customers TO nazareth_app;
GRANT INSERT ON nazareth.sales, nazareth.sale_items, nazareth.inventory_movements TO nazareth_app;
GRANT UPDATE (current_stock) ON nazareth.products TO nazareth_app;
GRANT INSERT, UPDATE, DELETE ON nazareth.promotions TO nazareth_app;
GRANT USAGE ON SEQUENCE nazareth.profiles_id_seq, nazareth.customers_id_seq,
  nazareth.sales_id_seq, nazareth.sale_items_id_seq, nazareth.inventory_movements_id_seq,
  nazareth.promotions_id_seq TO nazareth_app;

COMMIT;
