-- Add cookie policy to legal pages (same structure as terms/privacy/refund)
INSERT INTO legal_pages (key, language, title, content) VALUES
  ('cookie_policy', 'tr', 'Çerez Politikası', '<h2>Çerez Politikası</h2><p>Dreemart olarak çerezler ve benzeri teknolojileri nasıl kullandığımızı bu sayfada açıklıyoruz. İçeriği admin panelinden güncelleyebilirsiniz.</p>'),
  ('cookie_policy', 'en', 'Cookie Policy', '<h2>Cookie Policy</h2><p>This page explains how Dreemart uses cookies and similar technologies. You can update the content from the admin panel.</p>'),
  ('cookie_policy', 'es', 'Política de Cookies', '<h2>Política de Cookies</h2><p>Cómo utilizamos las cookies y tecnologías similares. Actualiza el contenido desde el panel de administración.</p>'),
  ('cookie_policy', 'de', 'Cookie-Richtlinie', '<h2>Cookie-Richtlinie</h2><p>Wie wir Cookies und ähnliche Technologien nutzen. Im Admin-Bereich bearbeitbar.</p>')
ON CONFLICT (key, language) DO NOTHING;
