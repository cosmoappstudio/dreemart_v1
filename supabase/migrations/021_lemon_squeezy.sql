-- 021: Lemon Squeezy ödeme entegrasyonu
-- pricing_packs: Lemon Squeezy variant ID (checkout URL ve webhook eşlemesi)
ALTER TABLE pricing_packs ADD COLUMN IF NOT EXISTS lemon_squeezy_variant_id TEXT;
COMMENT ON COLUMN pricing_packs.lemon_squeezy_variant_id IS 'Lemon Squeezy variant ID; checkout ve webhook bu paketle eşleştirilir.';

-- Webhook idempotency (duplicate işlemeyi önlemek için)
CREATE TABLE IF NOT EXISTS lemon_squeezy_webhook_events (
  id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Satış kayıtları (admin Satış & Gelir raporu için)
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

CREATE INDEX idx_lemon_squeezy_sales_created_at ON lemon_squeezy_sales(created_at DESC);
CREATE INDEX idx_lemon_squeezy_sales_user_id ON lemon_squeezy_sales(user_id);
CREATE INDEX idx_lemon_squeezy_sales_pack_id ON lemon_squeezy_sales(pack_id);
CREATE INDEX idx_lemon_squeezy_sales_country ON lemon_squeezy_sales(country_code);

ALTER TABLE lemon_squeezy_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read lemon_squeezy_sales" ON lemon_squeezy_sales FOR SELECT USING (public.is_admin());
CREATE POLICY "Service role full lemon_squeezy_sales" ON lemon_squeezy_sales FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
