-- 014: "infinite recursion detected in policy for relation profiles" düzeltmesi
-- Sebep: policies profiles tablosunu sorguluyor → RLS tekrar tetikleniyor → sonsuz döngü
-- Çözüm: is_admin() SECURITY DEFINER fonksiyonu (RLS bypass) kullan

-- 1) Admin kontrolü yapan fonksiyon – profiles okurken RLS bypass
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- 2) Recursive policy'leri kaldır
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- 3) is_admin() kullanan yeni policy'ler (recursion yok)
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update any profile" ON profiles FOR UPDATE
  USING (public.is_admin());
