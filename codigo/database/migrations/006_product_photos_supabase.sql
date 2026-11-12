-- Supabase-only Storage configuration. Does not touch business rows.
BEGIN;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('product-photos','product-photos',true,2097152,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=true,file_size_limit=2097152,
  allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'];
-- No authenticated/anon INSERT/UPDATE/DELETE policies are granted.
-- Express authorizes active administrators and uploads with the backend secret.
COMMIT;
