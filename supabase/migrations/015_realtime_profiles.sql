-- 015: profiles tablosu için Realtime etkinleştir
-- Admin kredi güncellemesi vb. anında UI'a yansır, sayfa yenilemeye gerek kalmaz.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  END IF;
END $$;
