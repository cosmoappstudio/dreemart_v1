-- Storage bucket for admin-uploaded artist avatars (public read)
-- See https://supabase.com/docs/guides/storage

-- Create bucket if your Supabase project has storage; else create "artist-avatars" (public) in Dashboard
INSERT INTO storage.buckets (id, name, public)
VALUES ('artist-avatars', 'artist-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read: anyone can view artist avatars
CREATE POLICY "Public read artist-avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'artist-avatars');

-- Admins can upload/update/delete in artist-avatars
CREATE POLICY "Admins insert artist-avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artist-avatars'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins update artist-avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'artist-avatars'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins delete artist-avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'artist-avatars'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
