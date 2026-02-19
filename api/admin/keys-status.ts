import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!supabaseUrl) return res.status(500).json({ error: 'Server config error' });
  const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY!);
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const admin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  const isAdmin = profile?.role === 'admin' || user.id === 'demo-user';
  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return res.status(200).json({
    replicate: !!(process.env.REPLICATE_API_TOKEN && process.env.REPLICATE_API_TOKEN.length > 10),
    paddle: !!(process.env.PADDLE_WEBHOOK_SECRET && process.env.PADDLE_API_KEY),
    supabase: !!(process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}
