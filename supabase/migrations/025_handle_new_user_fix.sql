-- 025: handle_new_user güvenli hale getir - site_settings okuma hatası yeni kullanıcı oluşturmayı engellemesin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  initial_credits INTEGER := 1;
  raw_val TEXT;
BEGIN
  BEGIN
    SELECT value INTO raw_val FROM public.site_settings WHERE key = 'new_user_credits' LIMIT 1;
    IF raw_val IS NOT NULL AND BTRIM(raw_val) <> '' THEN
      initial_credits := GREATEST(0, LEAST(999999, BTRIM(raw_val)::INTEGER));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    initial_credits := 1;
  END;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, username, credits)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'email',
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    'rüyacı_' || substr(md5(NEW.id::text || gen_random_uuid()::text), 1, 10),
    initial_credits
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
