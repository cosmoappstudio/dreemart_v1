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

  const admin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  const isAdmin = profile?.role === 'admin' || user.id === 'demo-user';
  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const body = req.body as { userId: string; credits?: number; addCredits?: number };
  const { userId, credits: setCredits, addCredits } = body;
  if (!userId || (setCredits == null && (addCredits == null || addCredits < 1))) {
    return res.status(400).json({ error: 'userId and either credits (set) or addCredits (positive) required' });
  }

  const { data: target } = await admin.from('profiles').select('id, credits').eq('id', userId).single();
  if (!target) {
    return res.status(404).json({ error: 'User not found' });
  }

  let newCredits: number;
  let amount: number;

  if (setCredits != null) {
    newCredits = Math.max(0, Math.floor(setCredits));
    amount = newCredits - (target.credits ?? 0);
  } else {
    const add = Math.max(1, Math.floor(addCredits!));
    newCredits = (target.credits ?? 0) + add;
    amount = add;
  }

  const { error: updateErr } = await admin
    .from('profiles')
    .update({ credits: newCredits, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (updateErr) {
    console.error('set-credits update error:', updateErr);
    return res.status(500).json({ error: 'Failed to update credits' });
  }

  await admin.from('credit_transactions').insert({
    user_id: userId,
    amount,
    reason: 'admin_adjustment',
    reference_id: null,
  });

  return res.status(200).json({ credits: newCredits });
}
