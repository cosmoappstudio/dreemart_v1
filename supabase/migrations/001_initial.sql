-- Dreemart: Initial schema
-- Run in Supabase SQL Editor or: supabase db push

-- Enum types
CREATE TYPE app_language AS ENUM ('tr', 'en', 'es', 'de');
CREATE TYPE subscription_tier AS ENUM ('free', 'pro');
CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE credit_reason AS ENUM ('welcome', 'purchase', 'dream_used', 'admin_adjustment', 'refund');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
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

-- Artists (famous painters)
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

-- Dreams (user generations)
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

-- Credit transactions (audit + balance)
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason credit_reason NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prompt templates (admin-editable)
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Paddle webhook idempotency
CREATE TABLE paddle_webhook_events (
  id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dreams_user_id ON dreams(user_id);
CREATE INDEX idx_dreams_created_at ON dreams(created_at DESC);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_artists_active_order ON artists(is_active, sort_order);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- Profiles: user sees own; service role sees all
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile (limited)" ON profiles FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = 'user');
CREATE POLICY "Service role full access profiles" ON profiles FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Artists: public read active only
CREATE POLICY "Anyone can read active artists" ON artists FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins full artists" ON artists FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Dreams: user CRUD own
CREATE POLICY "Users can read own dreams" ON dreams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dreams" ON dreams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can read all dreams" ON dreams FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update dreams (moderation)" ON dreams FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Credit transactions: user read own
CREATE POLICY "Users can read own transactions" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service/backend insert transactions" ON credit_transactions FOR INSERT WITH CHECK (TRUE);

-- Prompt templates: public read (for API)
CREATE POLICY "Anyone can read prompt_templates" ON prompt_templates FOR SELECT USING (TRUE);
CREATE POLICY "Admins can update prompt_templates" ON prompt_templates FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can insert prompt_templates" ON prompt_templates FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Trigger: create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, credits)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'email',
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    3
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed artists
INSERT INTO artists (slug, name, style_description, image_url, sort_order) VALUES
  ('vangogh', 'Van Gogh', 'oil painting, thick impasto strokes, swirling clouds, starry night style, vibrant blues and yellows, post-impressionism, expressive', 'https://picsum.photos/seed/vangogh/100/100', 1),
  ('dali', 'Salvador Dalí', 'surrealist painting, melting clocks, dreamscape, bizarre juxtaposition, hyper-realistic detail but impossible physics, desert landscape background', 'https://picsum.photos/seed/dali/100/100', 2),
  ('monet', 'Claude Monet', 'impressionist style, soft light, visible brushstrokes, garden atmosphere, water lilies, hazy, pastel colors, plein air', 'https://picsum.photos/seed/monet/100/100', 3),
  ('picasso', 'Pablo Picasso', 'cubist style, abstract geometric shapes, fragmented perspective, distorted faces, muted earth tones mixed with vivid colors', 'https://picsum.photos/seed/picasso/100/100', 4),
  ('kahlo', 'Frida Kahlo', 'naive art style, mexican folk art influence, vibrant tropical colors, self-portrait elements, nature and surreal symbolism, raw emotion', 'https://picsum.photos/seed/kahlo/100/100', 5),
  ('escher', 'M.C. Escher', 'lithograph style, impossible geometry, tessellations, mathematical precision, monochrome, infinite loops, architectural paradox', 'https://picsum.photos/seed/escher/100/100', 6),
  ('osmanhamdi', 'Osman Hamdi', 'orientalist painting, ottoman era details, realistic textures, intricate tile patterns, tortoises, warm lighting, historical setting', 'https://picsum.photos/seed/osman/100/100', 7);

-- Seed default prompt templates
INSERT INTO prompt_templates (key, content) VALUES
  ('dream_image', 'Create a masterpiece painting of the following scene in the style of {{artistName}}. Style description: {{styleDescription}}. The scene is based on this dream: "{{dreamText}}". Make it atmospheric, artistic, and evocative.'),
  ('dream_interpretation', 'Act as a dream interpretation expert and a mystical sage. Interpret the following dream for the user. Tone: Gentle, mysterious, and insightful. Dream: "{{dreamText}}". IMPORTANT: Provide the response in {{language}} language. Keep the response under 3 short paragraphs.');

-- Storage bucket (run in Dashboard or via API): dream-images, private or public per your choice
-- Here we assume public read for simplicity; RLS on storage can be added later

COMMENT ON TABLE profiles IS 'User profiles synced from auth.users';
COMMENT ON TABLE artists IS 'Famous artists for style transfer';
COMMENT ON TABLE dreams IS 'Generated dream images and interpretations';
COMMENT ON TABLE credit_transactions IS 'Credit balance changes';
COMMENT ON TABLE prompt_templates IS 'Admin-editable prompts for AI';
