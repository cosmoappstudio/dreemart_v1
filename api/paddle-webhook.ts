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
    const data = body?.data ?? {};
    const customData = data.custom_data ?? body?.custom_data ?? {};
    const userId = (customData.user_id ?? customData.userId) as string | undefined;
    const items = (data.items ?? []) as Array<{ price?: { product_id?: string; id?: string }; product?: { id?: string } }>;
    const productId = items[0]?.price?.product_id ?? items[0]?.product?.id ?? items[0]?.price?.id ?? data.product_id ?? customData.product_id;
    const productIdStr = productId?.toString?.() ?? customData.product_id;

    let credits = 0;
    let packId: string | null = null;
    let packName: string | null = null;
    if (productIdStr) {
      const { data: byPaddle } = await admin.from('pricing_packs').select('id, credits_amount, name').eq('paddle_product_id', productIdStr).maybeSingle();
      const pack = byPaddle ?? (productIdStr.match(/^[0-9a-f-]{36}$/i)
        ? (await admin.from('pricing_packs').select('id, credits_amount, name').eq('id', productIdStr).maybeSingle()).data
        : null;
      if (pack?.credits_amount != null && pack.credits_amount > 0) {
        credits = pack.credits_amount;
        packId = pack.id;
        packName = pack.name ?? null;
      } else {
        credits = CREDITS_BY_PRODUCT[productIdStr] ?? (productIdStr?.includes('credits') ? 10 : 0);
      }
    }

    const transactionId = data.id ?? body?.transaction_id ?? eventId;
    const details = data.details as { totals?: { total?: string; subtotal?: string } } | undefined;
    const amount = details?.totals?.total ?? details?.totals?.subtotal ?? null;
    const currencyCode = data.currency_code ?? 'USD';
    const countryCode = (data.address as { country_code?: string })?.country_code ?? customData.country_code ?? null;
    const customerEmail = (data.customer as { email?: string })?.email ?? customData.email ?? null;

    if (userId && credits > 0) {
      const { data: profile } = await admin.from('profiles').select('credits').eq('id', userId).single();
      if (profile) {
        const newCredits = (profile.credits ?? 0) + credits;
        const updatePayload: { credits: number; updated_at: string; last_purchased_pack_id?: string | null } = {
          credits: newCredits,
          updated_at: new Date().toISOString(),
        };
        if (packId) updatePayload.last_purchased_pack_id = packId;
        await admin.from('profiles').update(updatePayload).eq('id', userId);
        await admin.from('credit_transactions').insert({
          user_id: userId,
          amount: credits,
          reason: 'purchase',
          reference_id: eventId,
        });
      }
    }

    await admin.from('paddle_sales').upsert(
      {
        transaction_id: String(transactionId),
        event_id: String(eventId),
        user_id: userId || null,
        pack_id: packId,
        pack_name: packName,
        credits_amount: credits,
        amount: amount ? String(amount) : null,
        currency_code: currencyCode,
        country_code: countryCode,
        customer_email: customerEmail,
      },
      { onConflict: 'transaction_id', ignoreDuplicates: true }
    ).then(() => {}).catch(() => {});
  }

  return res.status(200).json({ received: true });
}
