import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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

  const body = req.body as { country_code?: string };
  let countryCode = typeof body?.country_code === 'string' ? body.country_code.trim().toUpperCase() : null;

  if (!countryCode || countryCode.length !== 2) {
    const vercelCountry = req.headers['x-vercel-ip-country'] as string | undefined;
    if (vercelCountry && /^[A-Z]{2}$/.test(vercelCountry)) {
      countryCode = vercelCountry;
    }
  }

  if (!countryCode) {
    return res.status(200).json({ ok: true, updated: false });
  }

  const admin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await admin
    .from('profiles')
    .update({ country_code: countryCode, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .is('country_code', null);

  if (error) {
    return res.status(500).json({ error: 'Failed to update' });
  }
  return res.status(200).json({ ok: true, updated: true, country_code: countryCode });
}
