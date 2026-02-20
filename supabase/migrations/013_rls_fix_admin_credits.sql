-- 013: RLS nedeniyle admin/kredi güncellemesi engelleniyorsa
-- Supabase SQL Editor'da çalıştır. SECURITY DEFINER = RLS bypass.

-- Email ile admin + kredi atayan fonksiyon (auth.users'tan id alır, profile oluşturur/günceller)
CREATE OR REPLACE FUNCTION public.set_admin_and_credits(
  user_email TEXT,
  new_credits INTEGER DEFAULT 10
)
RETURNS TABLE(ok BOOLEAN, profile_id UUID, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
  meta JSONB;
BEGIN
  SELECT id, raw_user_meta_data INTO uid, meta
  FROM auth.users WHERE email = user_email LIMIT 1;

  IF uid IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, ('auth.users''da email bulunamadı: ' || coalesce(user_email, 'NULL'))::TEXT;
    RETURN;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, username, credits, role, created_at, updated_at)
  VALUES (
    uid,
    user_email,
    meta->>'full_name',
    meta->>'avatar_url',
    'rüyacı_' || substr(md5(uid::TEXT || gen_random_uuid()::TEXT), 1, 10),
    new_credits,
    'admin',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    credits = new_credits,
    updated_at = NOW();

  RETURN QUERY SELECT TRUE, uid, 'Güncellendi. Profili yenile (F5) veya çıkış yapıp tekrar giriş yap.'::TEXT;
END;
$$;

-- KULLANIM (email'i kendi mailinle değiştir, SQL Editor'da Run):
-- SELECT * FROM set_admin_and_credits('gokturk4business@gmail.com', 10);
