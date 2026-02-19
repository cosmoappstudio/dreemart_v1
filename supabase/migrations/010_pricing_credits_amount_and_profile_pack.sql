-- Kredi paketlerinde sayısal kredi miktarı + Paddle eşlemesi; profilde son alınan paket.
-- Abonelik yok, sadece kredi paketleri satılıyor; tier sütunu "free" kalır (kredi kullanımı).

-- 1) pricing_packs: kredi miktarını sayı olarak tut (credits_text sadece gösterim)
ALTER TABLE pricing_packs ADD COLUMN IF NOT EXISTS credits_amount INTEGER;
ALTER TABLE pricing_packs ADD COLUMN IF NOT EXISTS paddle_product_id TEXT;

-- Metinden sayı çıkarıp backfill (örn. "15 Kredi" -> 15; sadece ilk sayı grubu)
UPDATE pricing_packs
SET credits_amount = COALESCE(
  (regexp_match(credits_text, '[0-9]+'))[1]::INTEGER,
  0
)
WHERE credits_amount IS NULL;

ALTER TABLE pricing_packs ALTER COLUMN credits_amount SET DEFAULT 0;
-- Mevcut satırlarda NULL kalmamalı (yukarıdaki UPDATE sonrası)
UPDATE pricing_packs SET credits_amount = 0 WHERE credits_amount IS NULL;
ALTER TABLE pricing_packs ALTER COLUMN credits_amount SET NOT NULL;

-- 2) profiles: kullanıcının son satın aldığı paket (abonelik değil, son alınan paket)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_purchased_pack_id UUID REFERENCES pricing_packs(id) ON DELETE SET NULL;

COMMENT ON COLUMN pricing_packs.credits_amount IS 'Paketteki kredi sayısı (sayısal); Paddle webhook bu değeri kullanır.';
COMMENT ON COLUMN pricing_packs.paddle_product_id IS 'Paddle ürün ID; webhook geldiğinde bu paketle eşleştirilir.';
COMMENT ON COLUMN profiles.last_purchased_pack_id IS 'Son satın alınan kredi paketi (abonelik yok, kredi paketi satışı).';
COMMENT ON COLUMN profiles.tier IS 'free = kredi kullanır; pro = sınırsız (isteğe bağlı). Abonelik yok, kredi paketleri satılıyor.';
