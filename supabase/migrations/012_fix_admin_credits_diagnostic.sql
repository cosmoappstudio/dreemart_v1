-- 012: Admin erişimi + kredi güncellemesi
-- Supabase Dashboard → SQL Editor'da çalıştır (Table Editor değil).

-- 1) Eksik username sütunu varsa ekle
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- 2) Username boş olan profilleri doldur
UPDATE profiles
SET username = 'rüyacı_' || substr(md5(id::text), 1, 10)
WHERE username IS NULL OR trim(username) = '';

-- 3) KENDİ EMAIL'İNİ YAZ – Admin ol
UPDATE profiles SET role = 'admin', updated_at = NOW()
WHERE email = 'gokturk4business@gmail.com';

-- 4) Kredileri güncelle (email ile)
UPDATE profiles SET credits = 10, updated_at = NOW()
WHERE email = 'gokturk4business@gmail.com';

-- Alternatif: Tüm sıfır kredililere 3 ver
-- UPDATE profiles SET credits = 3, updated_at = NOW() WHERE credits = 0 OR credits IS NULL;

-- RLS engelliyorsa 013'teki SECURITY DEFINER fonksiyonunu kullan:
-- SELECT * FROM set_admin_and_credits('gokturk4business@gmail.com', 10);
