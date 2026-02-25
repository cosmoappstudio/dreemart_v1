-- 032: profiles.last_order_id – Lemon Squeezy order ID (Meta CAPI/Pixel deduplication)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_order_id TEXT;
