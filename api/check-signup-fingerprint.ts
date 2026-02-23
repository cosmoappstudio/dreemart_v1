import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');
  return createClient(url, key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
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

  const fingerprint = (req.body as { fingerprint?: string })?.fingerprint;
  if (!fingerprint || typeof fingerprint !== 'string' || fingerprint.length < 8 || fingerprint.length > 128) {
    return res.status(400).json({ error: 'Invalid fingerprint' });
  }

  const admin = getSupabaseAdmin();

  const { data: maxSetting } = await admin.from('site_settings').select('value').eq('key', 'max_accounts_per_device').single();
  const maxPerDevice = Math.max(1, parseInt(String(maxSetting?.value || '1'), 10) || 1);

  const { data: existing } = await admin.from('signup_fingerprints').select('user_id').eq('fingerprint_hash', fingerprint);
  const otherUserIds = (existing ?? []).filter((r) => r.user_id !== user.id).map((r) => r.user_id);
  const uniqueOthers = [...new Set(otherUserIds)];

  if (uniqueOthers.length >= maxPerDevice) {
    await admin.from('profiles').update({ credits: 0, updated_at: new Date().toISOString() }).eq('id', user.id);
    await admin.from('signup_fingerprints').upsert(
      { fingerprint_hash: fingerprint, user_id: user.id },
      { onConflict: 'fingerprint_hash,user_id' }
    );
    return res.status(200).json({ creditsDeducted: true, credits: 0 });
  }

  await admin.from('signup_fingerprints').upsert(
    { fingerprint_hash: fingerprint, user_id: user.id },
    { onConflict: 'fingerprint_hash,user_id' }
  );
  return res.status(200).json({ creditsDeducted: false });
}
