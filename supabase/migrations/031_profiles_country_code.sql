-- Kayıt/kayıt ülkesi (admin raporları için)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_code TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_country_code ON profiles(country_code);
