-- Landing page example dreams (admin-editable, 2 rows: dream + artist + output image)
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

-- Seed 2 default examples (only if empty)
INSERT INTO landing_examples (dream_text, artist_name, image_url, sort_order)
SELECT * FROM (VALUES
  ('Denizin üstünde yürüyordum, ay ışığı suya vuruyordu...'::text, 'Van Gogh'::text, 'https://picsum.photos/seed/dreemart1/600/400'::text, 0),
  ('Uçan bir atın sırtında bulutların arasından geçiyordum.'::text, 'Salvador Dalí'::text, 'https://picsum.photos/seed/dreemart2/600/400'::text, 1)
) AS v(dream_text, artist_name, image_url, sort_order)
WHERE (SELECT COUNT(*) FROM landing_examples) = 0;

-- Pricing / credit packs (admin-editable)
CREATE TABLE IF NOT EXISTS pricing_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  per TEXT NOT NULL,
  credits_text TEXT NOT NULL,
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

INSERT INTO pricing_packs (name, price, per, credits_text, four_k, badge, sort_order)
SELECT * FROM (VALUES
  ('DENEME', '₺59', '/ 5 Kredi', '5 Kredi', FALSE, NULL::text, 0),
  ('BAŞLANGIÇ', '₺99', '/ 15 Kredi', '15 Kredi', FALSE, NULL, 1),
  ('POPÜLER', '₺149', '/ 30 Kredi', '30 Kredi', TRUE, 'Popüler', 2),
  ('PRO', '₺299', '/ 100 Kredi', '100 Kredi', TRUE, NULL, 3)
) AS v(name, price, per, credits_text, four_k, badge, sort_order)
WHERE (SELECT COUNT(*) FROM pricing_packs) = 0;

-- Site settings (logo URL, etc.)
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

-- Logo key: leave empty to use default Moon icon
INSERT INTO site_settings (key, value) VALUES ('logo_url', '') ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE landing_examples IS 'Landing page example dreams (2 rows: dream text, artist, image)';
COMMENT ON TABLE pricing_packs IS 'Credit packs shown on landing pricing section';
COMMENT ON TABLE site_settings IS 'Site-wide settings e.g. logo_url';
