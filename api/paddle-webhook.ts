import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');
  return createClient(url, key);
}

const CREDITS_BY_PRODUCT: Record<string, number> = {
  credits_10: 10,
  credits_50: 50,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  const signature = req.headers['paddle-signature'] as string;
  if (!signature || !process.env.PADDLE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: 'Webhook not configured' });
  }

  const crypto = await import('crypto');
  const hmac = crypto.createHmac('sha256', process.env.PADDLE_WEBHOOK_SECRET);
  hmac.update(rawBody);
  const expected = hmac.digest('hex');
  const received = signature.replace('sha256=', '');
  if (expected !== received) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const body = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
  const eventType = body.event_type || body?.data?.event_type;
  const eventId = body?.data?.id ?? body?.id ?? body?.event_id;

  const admin = getSupabaseAdmin();
  const { data: existing } = await admin.from('paddle_webhook_events').select('id').eq('id', String(eventId)).single();
  if (existing) {
    return res.status(200).json({ received: true });
  }

  await admin.from('paddle_webhook_events').insert({ id: String(eventId) }).then(() => {}).catch(() => {});

  if (eventType === 'transaction.completed' || eventType === 'subscription.payment_succeeded') {
    const customData = body?.data?.custom_data ?? body?.custom_data ?? {};
    const userId = customData.user_id ?? customData.userId;
    const productId = (body?.data?.product_id ?? body?.product_id ?? customData.product_id)?.toString?.() ?? customData.product_id;
    const credits = CREDITS_BY_PRODUCT[productId] ?? (productId?.includes('credits') ? 10 : 0);
    if (userId && credits > 0) {
      const { data: profile } = await admin.from('profiles').select('credits').eq('id', userId).single();
      if (profile) {
        const newCredits = (profile.credits ?? 0) + credits;
        await admin.from('profiles').update({ credits: newCredits, updated_at: new Date().toISOString() }).eq('id', userId);
        await admin.from('credit_transactions').insert({
          user_id: userId,
          amount: credits,
          reason: 'purchase',
          reference_id: eventId,
        });
      }
    }
  }

  return res.status(200).json({ received: true });
}
