-- 022: Checkout linki için UUID (Lemon Squeezy /checkout/buy/ UUID kullanır; webhook sayısal variant_id gönderir)
ALTER TABLE pricing_packs ADD COLUMN IF NOT EXISTS lemon_squeezy_checkout_uuid TEXT;
COMMENT ON COLUMN pricing_packs.lemon_squeezy_checkout_uuid IS 'Lemon Squeezy checkout URL için UUID (Share linkteki ID). Webhook eşlemesi lemon_squeezy_variant_id (sayısal) ile yapılır.';
