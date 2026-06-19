-- SEC: Move vector extension from public to extensions schema (idempotent).
-- Dev already done via 0044; this brings prod into alignment.
-- Supabase recommends extensions schema to keep PostgREST API surface clean.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'vector' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION vector SET SCHEMA extensions;
  END IF;
END;
$$;

-- SEC: Restrict avatars bucket SELECT policy to prevent file enumeration.
-- The bucket remains public: true, so CDN URLs continue to work.
-- This blocks unauthenticated callers from listing all avatar filenames
-- via the storage API (which would expose user UUIDs).
DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;

CREATE POLICY "Users can read their own avatar"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
