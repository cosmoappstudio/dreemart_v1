-- 026: get_new_user_credits helper + handle_new_user - Auth bağlantısında site_settings okumayı garanti et
CREATE OR REPLACE FUNCTION public.get_new_user_credits()
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v INTEGER;
BEGIN
  SELECT GREATEST(0, LEAST(999999, (BTRIM(value))::INTEGER))
    INTO v
    FROM public.site_settings
    WHERE key = 'new_user_credits'
    AND BTRIM(value) ~ '^[0-9]+$'
    LIMIT 1;
  RETURN COALESCE(v, 1);
EXCEPTION WHEN OTHERS THEN
  RETURN 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  initial_credits INTEGER;
BEGIN
  initial_credits := public.get_new_user_credits();

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
