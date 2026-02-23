-- 029: Ücretsiz krediler sadece ilk N ressam için; satın alma sonrası tüm ressamlara erişim
INSERT INTO site_settings (key, value) VALUES ('free_credits_artist_count', '2') ON CONFLICT (key) DO NOTHING;
