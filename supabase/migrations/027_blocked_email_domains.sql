-- 027: Geçici/disposable email domain'lerini engelle - çoklu hesap açma kötüye kullanımını azalt
CREATE TABLE IF NOT EXISTS public.blocked_email_domains (
  domain TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE blocked_email_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read blocked_email_domains" ON blocked_email_domains FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage blocked_email_domains" ON blocked_email_domains FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO blocked_email_domains (domain) VALUES
  ('tempmail.com'), ('temp-mail.org'), ('temp-mail.io'), ('tempmail.net'), ('tmpmail.org'),
  ('guerrillamail.com'), ('guerrillamail.org'), ('guerrillamail.net'), ('guerrillamail.de'),
  ('mailinator.com'), ('mailinator.net'), ('mailinator2.com'), ('mailinator.org'),
  ('10minutemail.com'), ('10minutemail.net'), ('10minutemail.org'),
  ('maildrop.cc'), ('getnada.com'), ('yopmail.com'), ('yopmail.fr'),
  ('throwaway.email'), ('trashmail.com'), ('fakeinbox.com'), ('dispostable.com'),
  ('mailnesia.com'), ('tempinbox.com'), ('sharklasers.com'), ('guerrillamail.info'),
  ('spam4.me'), ('mohmal.com'), ('emailondeck.com'), ('tempail.com'),
  ('discard.email'), ('discardmail.com'), ('mintemail.com'), ('mytrashmail.com'),
  ('temp-mail.ru'), ('mail.tm'), ('emailfake.com'), ('inboxkitten.com'),
  ('getairmail.com'), ('tmailor.com'), ('tempr.email'), ('emailhub.org'),
  ('33mail.com'), ('anonymbox.com'), ('mailcatch.com'), ('disposable.com'),
  ('hide.my'), ('temp-mail.live'), ('mailsac.com'), ('moakt.com')
ON CONFLICT (domain) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_email_domain_blocked(email_text TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_email_domains
    WHERE domain = LOWER(SPLIT_PART(email_text, '@', 2))
  )
$$;

-- handle_new_user: blocked domain -> 0 kredi
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  initial_credits INTEGER;
  user_email TEXT;
BEGIN
  user_email := NEW.raw_user_meta_data ->> 'email';
  IF user_email IS NULL OR user_email = '' OR public.is_email_domain_blocked(user_email) THEN
    initial_credits := 0;
  ELSE
    initial_credits := public.get_new_user_credits();
  END IF;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, username, credits)
  VALUES (
    NEW.id,
    user_email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    'rüyacı_' || substr(md5(NEW.id::text || gen_random_uuid()::text), 1, 10),
    initial_credits
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
