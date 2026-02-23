-- 024: Yeni kullanıcı başlangıç kredisini site_settings üzerinden yönet
INSERT INTO site_settings (key, value) VALUES ('new_user_credits', '1')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  initial_credits INTEGER;
BEGIN
  SELECT COALESCE(
    (SELECT (NULLIF(TRIM(COALESCE(value, '')), ''))::INTEGER FROM site_settings WHERE key = 'new_user_credits' LIMIT 1),
    1
  ) INTO initial_credits;
  IF initial_credits < 0 THEN initial_credits := 0; END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;
