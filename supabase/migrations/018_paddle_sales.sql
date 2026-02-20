-- 018: Paddle satış kayıtları (admin Satış & Gelir raporu için)
CREATE TABLE IF NOT EXISTS paddle_sales (
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

CREATE INDEX idx_paddle_sales_created_at ON paddle_sales(created_at DESC);
CREATE INDEX idx_paddle_sales_user_id ON paddle_sales(user_id);
CREATE INDEX idx_paddle_sales_pack_id ON paddle_sales(pack_id);
CREATE INDEX idx_paddle_sales_country ON paddle_sales(country_code);

ALTER TABLE paddle_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read paddle_sales" ON paddle_sales FOR SELECT USING (public.is_admin());
CREATE POLICY "Service role full paddle_sales" ON paddle_sales FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
