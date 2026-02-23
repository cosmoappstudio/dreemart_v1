-- 028: Cihaz parmak izi - aynı cihazda farklı maillerle çoklu hesap açmayı sınırla
CREATE TABLE IF NOT EXISTS public.signup_fingerprints (
  fingerprint_hash TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (fingerprint_hash, user_id)
);

CREATE INDEX IF NOT EXISTS idx_signup_fingerprints_hash ON signup_fingerprints(fingerprint_hash);

ALTER TABLE signup_fingerprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full signup_fingerprints" ON signup_fingerprints FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
-- Anon/client sadece kendi user_id ile okuma (API service role kullanacak)
CREATE POLICY "Users can read own fingerprints" ON signup_fingerprints FOR SELECT
  USING (auth.uid() = user_id);

-- Site ayarı: cihaz başına max hesap (1 = aynı cihazda ikinci hesap 0 kredi)
INSERT INTO site_settings (key, value) VALUES ('max_accounts_per_device', '1') ON CONFLICT (key) DO NOTHING;
