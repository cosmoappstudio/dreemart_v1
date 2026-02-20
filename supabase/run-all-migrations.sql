-- Dreemart: Tüm migration'lar tek seferde (001 → 008)
-- Supabase Dashboard → SQL Editor → New query → yapıştır → Run
-- Not: İlk çalıştırmada hata alırsan (örn. "type already exists") o bloğu atlayıp devam edebilirsin.

-- ========== 001_initial ==========
CREATE TYPE app_language AS ENUM ('tr', 'en', 'es', 'de');
-- free = kredi kullanır, pro = sınırsız (ileride). Abonelik yok, sadece kredi paketleri.
CREATE TYPE subscription_tier AS ENUM ('free', 'pro');
CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE credit_reason AS ENUM ('welcome', 'purchase', 'dream_used', 'admin_adjustment', 'refund');

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  username TEXT UNIQUE,
  language app_language NOT NULL DEFAULT 'tr',
  credits INTEGER NOT NULL DEFAULT 3,
  tier subscription_tier NOT NULL DEFAULT 'free',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  ban_reason TEXT,
  banned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  style_description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  artist_id UUID NOT NULL REFERENCES artists(id),
  image_url TEXT,
  interpretation TEXT,
  moderation_status moderation_status NOT NULL DEFAULT 'approved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason credit_reason NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

CREATE TABLE paddle_webhook_events (
  id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dreams_user_id ON dreams(user_id);
CREATE INDEX idx_dreams_created_at ON dreams(created_at DESC);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_artists_active_order ON artists(is_active, sort_order);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile (limited)" ON profiles FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = 'user');
CREATE POLICY "Service role full access profiles" ON profiles FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Anyone can read active artists" ON artists FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins full artists" ON artists FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can read own dreams" ON dreams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dreams" ON dreams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can read all dreams" ON dreams FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update dreams (moderation)" ON dreams FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can read own transactions" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service/backend insert transactions" ON credit_transactions FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Anyone can read prompt_templates" ON prompt_templates FOR SELECT USING (TRUE);
CREATE POLICY "Admins can update prompt_templates" ON prompt_templates FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can insert prompt_templates" ON prompt_templates FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO artists (slug, name, style_description, image_url, sort_order) VALUES
  ('vangogh', 'Van Gogh', 'oil painting, thick impasto strokes, swirling clouds, starry night style, vibrant blues and yellows, post-impressionism, expressive', 'https://picsum.photos/seed/vangogh/100/100', 1),
  ('dali', 'Salvador Dalí', 'surrealist painting, melting clocks, dreamscape, bizarre juxtaposition, hyper-realistic detail but impossible physics, desert landscape background', 'https://picsum.photos/seed/dali/100/100', 2),
  ('monet', 'Claude Monet', 'impressionist style, soft light, visible brushstrokes, garden atmosphere, water lilies, hazy, pastel colors, plein air', 'https://picsum.photos/seed/monet/100/100', 3),
  ('picasso', 'Pablo Picasso', 'cubist style, abstract geometric shapes, fragmented perspective, distorted faces, muted earth tones mixed with vivid colors', 'https://picsum.photos/seed/picasso/100/100', 4),
  ('kahlo', 'Frida Kahlo', 'naive art style, mexican folk art influence, vibrant tropical colors, self-portrait elements, nature and surreal symbolism, raw emotion', 'https://picsum.photos/seed/kahlo/100/100', 5),
  ('escher', 'M.C. Escher', 'lithograph style, impossible geometry, tessellations, mathematical precision, monochrome, infinite loops, architectural paradox', 'https://picsum.photos/seed/escher/100/100', 6),
  ('osmanhamdi', 'Osman Hamdi', 'orientalist painting, ottoman era details, realistic textures, intricate tile patterns, tortoises, warm lighting, historical setting', 'https://picsum.photos/seed/osman/100/100', 7)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO prompt_templates (key, content) VALUES
  ('dream_image', 'Create a masterpiece painting of the following scene in the style of {{artistName}}. Style description: {{styleDescription}}. The scene is based on this dream: "{{dreamText}}". Make it atmospheric, artistic, and evocative.'),
  ('dream_interpretation', 'Act as a dream interpretation expert and a mystical sage. Interpret the following dream for the user. Tone: Gentle, mysterious, and insightful. Dream: "{{dreamText}}". IMPORTANT: Provide the response in {{language}} language. Keep the response under 3 short paragraphs.')
ON CONFLICT (key) DO NOTHING;

-- ========== 002_admin_policies ==========
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "Admins can update any profile" ON profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "Admins can insert credit_transactions" ON credit_transactions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========== 003_replicate_models ==========
CREATE TABLE replicate_models (
  key TEXT PRIMARY KEY,
  model_identifier TEXT NOT NULL,
  input_preset TEXT NOT NULL DEFAULT 'default' CHECK (input_preset IN ('imagen', 'flux', 'llm', 'default')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);
ALTER TABLE replicate_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read replicate_models" ON replicate_models FOR SELECT USING (TRUE);
CREATE POLICY "Admins can update replicate_models" ON replicate_models FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can insert replicate_models" ON replicate_models FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
INSERT INTO replicate_models (key, model_identifier, input_preset) VALUES
  ('image_generation', 'google/imagen-4', 'imagen'),
  ('interpretation', 'anthropic/claude-3.5-sonnet', 'llm')
ON CONFLICT (key) DO NOTHING;

-- ========== 004_seed_more_artists ==========
INSERT INTO artists (slug, name, style_description, image_url, sort_order) VALUES
  ('rembrandt', 'Rembrandt', 'baroque painting, dramatic chiaroscuro, deep shadows, golden light, rich browns, portrait mastery, emotional depth, dutch golden age', 'https://picsum.photos/seed/rembrandt/100/100', 8),
  ('vermeer', 'Johannes Vermeer', 'dutch golden age, soft natural light from window, domestic scenes, pearl earrings, calm atmosphere, meticulous detail, subtle colors', 'https://picsum.photos/seed/vermeer/100/100', 9),
  ('caravaggio', 'Caravaggio', 'baroque, tenebrism, dramatic spotlight on figures, dark background, religious drama, intense realism, bold contrast', 'https://picsum.photos/seed/caravaggio/100/100', 10),
  ('michelangelo', 'Michelangelo', 'renaissance, muscular figures, fresco style, monumental scale, sistine chapel, dynamic poses, heroic nude', 'https://picsum.photos/seed/michelangelo/100/100', 11),
  ('leonardo', 'Leonardo da Vinci', 'renaissance, sfumato soft edges, mysterious smile, atmospheric perspective, scientific detail, delicate light', 'https://picsum.photos/seed/leonardo/100/100', 12),
  ('botticelli', 'Sandro Botticelli', 'early renaissance, flowing hair and drapery, mythological themes, birth of venus, delicate line, pastel tones', 'https://picsum.photos/seed/botticelli/100/100', 13),
  ('turner', 'J.M.W. Turner', 'romanticism, seascapes, storms, luminous atmosphere, steam and light, almost abstract swirls of color', 'https://picsum.photos/seed/turner/100/100', 14),
  ('hokusai', 'Hokusai', 'japanese ukiyo-e woodblock print, great wave, mount fuji, bold lines, flat color blocks, blue and white', 'https://picsum.photos/seed/hokusai/100/100', 15),
  ('klimt', 'Gustav Klimt', 'art nouveau, gold leaf, decorative patterns, the kiss, female figures, mosaic-like surfaces, ornamental', 'https://picsum.photos/seed/klimt/100/100', 16),
  ('magritte', 'René Magritte', 'surrealism, bowler hat, pipe, blue sky with clouds, paradoxical imagery, clean realistic technique, belgian', 'https://picsum.photos/seed/magritte/100/100', 17),
  ('warhol', 'Andy Warhol', 'pop art, screen print, repeated imagery, campbell soup, marilyn monroe, bright flat colors, mass media', 'https://picsum.photos/seed/warhol/100/100', 18),
  ('pollock', 'Jackson Pollock', 'abstract expressionism, drip painting, splattered threads of paint, chaotic energy, no clear subject, action painting', 'https://picsum.photos/seed/pollock/100/100', 19),
  ('rothko', 'Mark Rothko', 'color field painting, large soft rectangles, stacked blocks of color, meditative, luminous edges, abstract', 'https://picsum.photos/seed/rothko/100/100', 20),
  ('hopper', 'Edward Hopper', 'american realism, loneliness, diners at night, stark light and shadow, empty streets, cinematic stillness', 'https://picsum.photos/seed/hopper/100/100', 21),
  ('okeeffe', 'Georgia O''Keeffe', 'modernist, large flowers, new mexico desert, bones, soft gradients, sensual organic forms, bold scale', 'https://picsum.photos/seed/okeeffe/100/100', 22),
  ('basquiat', 'Jean-Michel Basquiat', 'neo-expressionism, graffiti, crown, raw text, skulls, bold lines, street art meets museum', 'https://picsum.photos/seed/basquiat/100/100', 23),
  ('mucha', 'Alphonse Mucha', 'art nouveau, decorative panels, flowing hair, floral frames, pale women, poster style, ornamental', 'https://picsum.photos/seed/mucha/100/100', 24),
  ('rousseau', 'Henri Rousseau', 'naive art, jungle scenes, exotic plants, sleeping gypsy, flat perspective, dreamlike, self-taught', 'https://picsum.photos/seed/rousseau/100/100', 25),
  ('kandinsky', 'Wassily Kandinsky', 'abstract, geometric shapes, musical rhythm, bold primary colors, non-representational, bauhaus', 'https://picsum.photos/seed/kandinsky/100/100', 26),
  ('mondrian', 'Piet Mondrian', 'neoplasticism, grid, primary colors red yellow blue, black lines, white space, pure abstraction', 'https://picsum.photos/seed/mondrian/100/100', 27),
  ('chagall', 'Marc Chagall', 'dreamlike, floating figures, village memories, lovers, vibrant color, folk and cubist influence', 'https://picsum.photos/seed/chagall/100/100', 28),
  ('miro', 'Joan Miró', 'surrealism, biomorphic shapes, stars and moons, primary colors, playful, childlike, catalan', 'https://picsum.photos/seed/miro/100/100', 29),
  ('bacon', 'Francis Bacon', 'distorted figures, screaming popes, raw meat, triptych, dark background, existential angst', 'https://picsum.photos/seed/bacon/100/100', 30),
  ('hockney', 'David Hockney', 'bright california pools, palm trees, double portrait, flat vivid color, swimming pools, modern life', 'https://picsum.photos/seed/hockney/100/100', 31),
  ('goya', 'Francisco Goya', 'spanish romanticism, dark period, black paintings, war disasters, haunting, dramatic, psychological', 'https://picsum.photos/seed/goya/100/100', 32),
  ('elgreco', 'El Greco', 'mannerist, elongated figures, dramatic sky, spanish renaissance, mystical, tall saints, vibrant', 'https://picsum.photos/seed/elgreco/100/100', 33),
  ('cezanne', 'Paul Cézanne', 'post-impressionism, geometric blocks, still life apples, mont saint-victoire, constructive brushstrokes', 'https://picsum.photos/seed/cezanne/100/100', 34),
  ('renoir', 'Pierre-Auguste Renoir', 'impressionism, soft light, dancers, luncheon of the boating party, warm skin tones, joyful', 'https://picsum.photos/seed/renoir/100/100', 35),
  ('gauguin', 'Paul Gauguin', 'post-impressionism, tahiti, flat color, tropical women, symbolic, primitivist, bold outlines', 'https://picsum.photos/seed/gauguin/100/100', 36),
  ('toulouselautrec', 'Henri de Toulouse-Lautrec', 'post-impressionism, moulin rouge posters, cabaret, flat color, japonisme, nightlife paris', 'https://picsum.photos/seed/toulouse/100/100', 37),
  ('seurat', 'Georges Seurat', 'pointillism, dots of pure color, sunday afternoon, scientific color theory, neo-impressionism', 'https://picsum.photos/seed/seurat/100/100', 38),
  ('lempicka', 'Tamara de Lempicka', 'art deco, streamlined figures, metallic skin, 1920s glamour, bold geometry, luxury', 'https://picsum.photos/seed/lempicka/100/100', 39),
  ('kusama', 'Yayoi Kusama', 'contemporary, polka dots, infinity mirrors, pumpkins, obsessive repetition, bold colors', 'https://picsum.photos/seed/kusama/100/100', 40)
ON CONFLICT (slug) DO NOTHING;

-- ========== 005_storage_artist_avatars ==========
INSERT INTO storage.buckets (id, name, public)
VALUES ('artist-avatars', 'artist-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public read artist-avatars" ON storage.objects FOR SELECT
USING (bucket_id = 'artist-avatars');
CREATE POLICY "Admins insert artist-avatars" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artist-avatars'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins update artist-avatars" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'artist-avatars'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins delete artist-avatars" ON storage.objects FOR DELETE
USING (
  bucket_id = 'artist-avatars'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ========== 006_legal_pages ==========
CREATE TABLE legal_pages (
  key TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('tr', 'en', 'es', 'de')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  PRIMARY KEY (key, language)
);
ALTER TABLE legal_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read legal_pages" ON legal_pages FOR SELECT USING (TRUE);
CREATE POLICY "Admins can update legal_pages" ON legal_pages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can insert legal_pages" ON legal_pages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO legal_pages (key, language, title, content) VALUES
  ('terms', 'tr', 'Kullanım Koşulları', '<h2>Kullanım Koşulları</h2><p>Dreemart hizmetini kullanarak aşağıdaki koşulları kabul etmiş olursunuz. Lütfen içeriği admin panelinden güncelleyin.</p>'),
  ('terms', 'en', 'Terms of Use', '<h2>Terms of Use</h2><p>By using Dreemart you agree to the following terms. Please update the content from the admin panel.</p>'),
  ('terms', 'es', 'Términos de Uso', '<h2>Términos de Uso</h2><p>Al usar Dreemart aceptas los siguientes términos. Actualiza el contenido desde el panel de administración.</p>'),
  ('terms', 'de', 'Nutzungsbedingungen', '<h2>Nutzungsbedingungen</h2><p>Mit der Nutzung von Dreemart akzeptierst du die folgenden Bedingungen. Bitte aktualisiere den Inhalt im Admin-Bereich.</p>'),
  ('privacy', 'tr', 'Gizlilik Politikası', '<h2>Gizlilik Politikası</h2><p>Kişisel verileriniz nasıl toplanır ve kullanılır. Admin panelinden düzenleyebilirsiniz.</p>'),
  ('privacy', 'en', 'Privacy Policy', '<h2>Privacy Policy</h2><p>How we collect and use your personal data. You can edit this from the admin panel.</p>'),
  ('privacy', 'es', 'Política de Privacidad', '<h2>Política de Privacidad</h2><p>Cómo recopilamos y usamos tus datos. Edita desde el panel de administración.</p>'),
  ('privacy', 'de', 'Datenschutz', '<h2>Datenschutz</h2><p>Wie wir deine Daten erfassen und nutzen. Im Admin-Bereich bearbeitbar.</p>'),
  ('refund_policy', 'tr', 'İade Politikası', '<h2>İade Politikası</h2><p>Ödeme ve iade koşulları. Admin panelinden güncelleyin.</p>'),
  ('refund_policy', 'en', 'Refund Policy', '<h2>Refund Policy</h2><p>Payment and refund conditions. Update from the admin panel.</p>'),
  ('refund_policy', 'es', 'Política de Reembolso', '<h2>Política de Reembolso</h2><p>Condiciones de pago y reembolso. Actualiza desde el panel de administración.</p>'),
  ('refund_policy', 'de', 'Rückerstattungsrichtlinie', '<h2>Rückerstattungsrichtlinie</h2><p>Zahlungs- und Rückgabebedingungen. Im Admin-Bereich aktualisierbar.</p>')
ON CONFLICT (key, language) DO NOTHING;

-- ========== 007_landing_pricing_site ==========
CREATE TABLE IF NOT EXISTS landing_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_text TEXT NOT NULL DEFAULT '',
  artist_name TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE landing_examples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read landing_examples" ON landing_examples FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage landing_examples" ON landing_examples FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO landing_examples (dream_text, artist_name, image_url, sort_order)
SELECT a.dream_text, a.artist_name, a.image_url, a.sort_order
FROM (VALUES
  ('Denizin üstünde yürüyordum, ay ışığı suya vuruyordu...'::text, 'Van Gogh'::text, 'https://picsum.photos/seed/dreemart1/600/400'::text, 0),
  ('Uçan bir atın sırtında bulutların arasından geçiyordum.'::text, 'Salvador Dalí'::text, 'https://picsum.photos/seed/dreemart2/600/400'::text, 1)
) AS a(dream_text, artist_name, image_url, sort_order)
WHERE (SELECT COUNT(*) FROM landing_examples) = 0;

CREATE TABLE IF NOT EXISTS pricing_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  per TEXT NOT NULL,
  credits_text TEXT NOT NULL,
  credits_amount INTEGER NOT NULL DEFAULT 0,
  paddle_product_id TEXT,
  four_k BOOLEAN NOT NULL DEFAULT FALSE,
  badge TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE pricing_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pricing_packs" ON pricing_packs FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage pricing_packs" ON pricing_packs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO pricing_packs (name, price, per, credits_text, credits_amount, four_k, badge, sort_order)
SELECT p.name, p.price, p.per, p.credits_text, p.credits_amount, p.four_k, p.badge, p.sort_order
FROM (VALUES
  ('DENEME', '₺59', '/ 5 Kredi', '5 Kredi', 5, FALSE, NULL::text, 0),
  ('BAŞLANGIÇ', '₺99', '/ 15 Kredi', '15 Kredi', 15, FALSE, NULL::text, 1),
  ('POPÜLER', '₺149', '/ 30 Kredi', '30 Kredi', 30, TRUE, 'Popüler', 2),
  ('PRO', '₺299', '/ 100 Kredi', '100 Kredi', 100, TRUE, NULL::text, 3)
) AS p(name, price, per, credits_text, credits_amount, four_k, badge, sort_order)
WHERE (SELECT COUNT(*) FROM pricing_packs) = 0;

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read site_settings" ON site_settings FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage site_settings" ON site_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
INSERT INTO site_settings (key, value) VALUES ('logo_url', '') ON CONFLICT (key) DO NOTHING;

-- profiles: son alınan kredi paketi (pricing_packs sonra oluşturulduğu için burada eklenir)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_purchased_pack_id UUID REFERENCES pricing_packs(id) ON DELETE SET NULL;

-- ========== 008_legal_cookie_policy ==========
INSERT INTO legal_pages (key, language, title, content) VALUES
  ('cookie_policy', 'tr', 'Çerez Politikası', '<h2>Çerez Politikası</h2><p>Dreemart olarak çerezler ve benzeri teknolojileri nasıl kullandığımızı bu sayfada açıklıyoruz. İçeriği admin panelinden güncelleyebilirsiniz.</p>'),
  ('cookie_policy', 'en', 'Cookie Policy', '<h2>Cookie Policy</h2><p>This page explains how Dreemart uses cookies and similar technologies. You can update the content from the admin panel.</p>'),
  ('cookie_policy', 'es', 'Política de Cookies', '<h2>Política de Cookies</h2><p>Cómo utilizamos las cookies y tecnologías similares. Actualiza el contenido desde el panel de administración.</p>'),
  ('cookie_policy', 'de', 'Cookie-Richtlinie', '<h2>Cookie-Richtlinie</h2><p>Wie wir Cookies und ähnliche Technologien nutzen. Im Admin-Bereich bearbeitbar.</p>')
ON CONFLICT (key, language) DO NOTHING;

-- ========== 021_lemon_squeezy ==========
ALTER TABLE pricing_packs ADD COLUMN IF NOT EXISTS lemon_squeezy_variant_id TEXT;
CREATE TABLE IF NOT EXISTS lemon_squeezy_webhook_events (id TEXT PRIMARY KEY, processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS lemon_squeezy_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT UNIQUE NOT NULL,
  event_id TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  pack_id UUID REFERENCES pricing_packs(id) ON DELETE SET NULL,
  pack_name TEXT,
  credits_amount INTEGER NOT NULL DEFAULT 0,
  amount TEXT,
  currency_code TEXT DEFAULT 'USD',
  country_code TEXT,
  customer_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ls_sales_created_at ON lemon_squeezy_sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ls_sales_user_id ON lemon_squeezy_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_ls_sales_pack_id ON lemon_squeezy_sales(pack_id);
CREATE INDEX IF NOT EXISTS idx_ls_sales_country ON lemon_squeezy_sales(country_code);
ALTER TABLE lemon_squeezy_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read lemon_squeezy_sales" ON lemon_squeezy_sales;
CREATE POLICY "Admins can read lemon_squeezy_sales" ON lemon_squeezy_sales FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Service role full lemon_squeezy_sales" ON lemon_squeezy_sales;
CREATE POLICY "Service role full lemon_squeezy_sales" ON lemon_squeezy_sales FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ========== Admin ataması (ilk Google girişinden SONRA çalıştır) ==========
-- Bu satırı ilk kez gokturk4business@gmail.com ile giriş yaptıktan sonra
-- Supabase SQL Editor'da ayrı bir sorgu olarak çalıştır:
--
-- UPDATE profiles SET role = 'admin' WHERE email = 'gokturk4business@gmail.com';
