-- 023: Yeni üyelere verilen deneme kredisini 3'ten 1'e düşür
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, username, credits)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'email',
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    'rüyacı_' || substr(md5(NEW.id::text || gen_random_uuid()::text), 1, 10),
    1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
