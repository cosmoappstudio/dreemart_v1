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
  const isAdmin = profile?.role === 'admin';
  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const body = req.body as {
    userId: string;
    credits?: number;
    addCredits?: number;
    addPack?: { packId: string };
    removePack?: boolean;
  };
  const { userId, credits: setCredits, addCredits, addPack, removePack } = body;

  const hasOp = setCredits != null || (addCredits != null && addCredits >= 1) || (addPack?.packId) || removePack;
  if (!userId || !hasOp) {
    return res.status(400).json({ error: 'userId and one of: credits, addCredits, addPack, removePack required' });
  }
  if ([setCredits != null, addCredits != null && addCredits >= 1, !!addPack?.packId, !!removePack].filter(Boolean).length > 1) {
    return res.status(400).json({ error: 'Only one operation at a time' });
  }

  const { data: target } = await admin.from('profiles').select('id, credits, last_purchased_pack_id').eq('id', userId).single();
  if (!target) {
    return res.status(404).json({ error: 'User not found' });
  }

  let newCredits: number = target.credits ?? 0;
  let amount = 0;
  let lastPurchasedPackId: string | null = target.last_purchased_pack_id ?? null;

  if (addPack?.packId) {
    const { data: pack } = await admin.from('pricing_packs').select('id, credits_amount').eq('id', addPack.packId).single();
    if (!pack) return res.status(404).json({ error: 'Pack not found' });
    const add = Math.max(0, pack.credits_amount ?? 0);
    newCredits += add;
    amount = add;
    lastPurchasedPackId = pack.id;
  } else if (removePack) {
    lastPurchasedPackId = null;
    amount = 0;
  } else if (setCredits != null) {
    newCredits = Math.max(0, Math.floor(setCredits));
    amount = newCredits - (target.credits ?? 0);
  } else if (addCredits != null && addCredits >= 1) {
    const add = Math.max(1, Math.floor(addCredits));
    newCredits += add;
    amount = add;
  }

  const updatePayload: Record<string, unknown> = { credits: newCredits, updated_at: new Date().toISOString() };
  if (addPack?.packId !== undefined) updatePayload.last_purchased_pack_id = lastPurchasedPackId;
  if (removePack) updatePayload.last_purchased_pack_id = null;

  const { error: updateErr } = await admin
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId);

  if (updateErr) {
    console.error('set-credits update error:', updateErr);
    return res.status(500).json({ error: 'Failed to update profile' });
  }

  if (amount !== 0) {
    await admin.from('credit_transactions').insert({
      user_id: userId,
      amount,
      reason: 'admin_adjustment',
      reference_id: addPack?.packId ?? null,
    });
  }

  return res.status(200).json({
    credits: newCredits,
    last_purchased_pack_id: lastPurchasedPackId,
  });
}
