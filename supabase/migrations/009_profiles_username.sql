-- Add username to profiles (run this if profiles table already exists without username)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Backfill existing profiles with a unique username derived from id
UPDATE profiles
SET username = 'rüyacı_' || substr(md5(id::text), 1, 10)
WHERE username IS NULL;

-- Give 3 welcome credits to existing users who have 0 (new users already get 3 from trigger)
UPDATE profiles SET credits = 3 WHERE credits = 0 AND tier = 'free';

-- Update trigger so new users get username on signup
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
    3
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
