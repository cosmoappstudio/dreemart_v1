-- 020: Replicate görsellerini kalıcı saklamak için dream-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('dream-images', 'dream-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public read dream-images" ON storage.objects FOR SELECT
USING (bucket_id = 'dream-images');

-- Service role (generate-dream API) upload yapabilsin
CREATE POLICY "Service role insert dream-images" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'dream-images' AND (auth.jwt() ->> 'role' = 'service_role'));
