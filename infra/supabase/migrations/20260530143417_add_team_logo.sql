-- Add logo_url to teams table
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS logo_url TEXT NULL;

-- Storage bucket for team logos (public read, owner-restricted write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-logos',
  'team-logos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: team owner can upload/update/delete their logo
CREATE POLICY "team_logos_owner_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'team-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "team_logos_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'team-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "team_logos_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'team-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Rollback: ALTER TABLE public.teams DROP COLUMN IF EXISTS logo_url;
-- DELETE FROM storage.buckets WHERE id = 'team-logos';
