import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/** Login/landing sayfaları için üretilmiş rüya görselleri - public, auth gerekmez */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return res.status(500).json({ error: 'Server config error', images: [] });
  }

  const admin = createClient(url, key);
  const { data, error } = await admin
    .from('dreams')
    .select('image_url')
    .not('image_url', 'is', null)
    .eq('moderation_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(24);

  if (error || !data) {
    return res.status(200).json({ images: [] });
  }

  const images = data
    .map((r) => (r as { image_url: string }).image_url)
    .filter((u): u is string => typeof u === 'string' && u.length > 0);

  return res.status(200).json({ images });
}
