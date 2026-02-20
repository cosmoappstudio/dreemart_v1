-- 017: Her paket için "X ressam tarzı" sayısı düzenlenebilir
ALTER TABLE pricing_packs ADD COLUMN IF NOT EXISTS artist_styles_count INTEGER DEFAULT 40;
UPDATE pricing_packs SET artist_styles_count = 40 WHERE artist_styles_count IS NULL;
