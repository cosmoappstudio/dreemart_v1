-- 016: Sosyal medya linkleri (footer) + site-assets bucket (logo upload)
-- Supabase SQL Editor'da çalıştır.

-- 1) Sosyal medya linkleri (site_settings)
INSERT INTO site_settings (key, value) VALUES
  ('social_instagram', ''),
  ('social_tiktok', ''),
  ('social_facebook', ''),
  ('social_twitter', ''),
  ('social_youtube', '')
ON CONFLICT (key) DO NOTHING;

-- 2) Logo upload için site-assets bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public read site-assets" ON storage.objects FOR SELECT
USING (bucket_id = 'site-assets');

CREATE POLICY "Admins insert site-assets" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'site-assets' AND public.is_admin());

CREATE POLICY "Admins update site-assets" ON storage.objects FOR UPDATE
USING (bucket_id = 'site-assets' AND public.is_admin());

CREATE POLICY "Admins delete site-assets" ON storage.objects FOR DELETE
USING (bucket_id = 'site-assets' AND public.is_admin());
