-- Legal pages: terms, privacy, refund-policy (admin-editable, per language)
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

COMMENT ON TABLE legal_pages IS 'Terms, Privacy, Refund Policy content per language (admin-editable)';

-- Seed placeholder content (HTML allowed)
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
