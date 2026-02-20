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

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  const signature = req.headers['x-signature'] as string;
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return res.status(400).json({ error: 'Webhook not configured' });
  }

  const crypto = await import('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const expected = hmac.digest('hex');
  if (expected.length !== signature.length || !crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const body = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
  const eventName = (req.headers['x-event-name'] as string) || body?.meta?.event_name;
  const eventId = body?.data?.id ?? body?.meta?.event_name + '-' + Date.now();

  const admin = getSupabaseAdmin();
  const { data: existing } = await admin
    .from('lemon_squeezy_webhook_events')
    .select('id')
    .eq('id', String(eventId))
    .single();
  if (existing) {
    return res.status(200).json({ received: true });
  }

  await admin
    .from('lemon_squeezy_webhook_events')
    .insert({ id: String(eventId) })
    .then(() => {})
    .catch(() => {});

  // One-time orders: order_created. Subscriptions: subscription_created / subscription_payment_success
  const isOrder = eventName === 'order_created';
  const isSubPayment = eventName === 'subscription_payment_success' || eventName === 'subscription_payment_succeeded';

  if (isOrder || isSubPayment) {
    const data = body?.data ?? {};
    const attrs = data.attributes ?? {};
    const customData = body?.meta?.custom_data ?? attrs?.custom_data ?? {};
    const userId = (customData.user_id ?? customData.userId) as string | undefined;

    let variantId: string | undefined;
    let orderId: string | undefined;
    let total: string | null = null;
    let currencyCode = 'USD';
    let userEmail: string | null = null;
    let countryCode: string | null = null;

    if (isOrder) {
      orderId = data.id ?? attrs.identifier;
      variantId = String(attrs?.first_order_item?.variant_id ?? '');
      total = attrs.total != null ? String(attrs.total) : null;
      currencyCode = attrs.currency ?? 'USD';
      userEmail = attrs.user_email ?? null;
      countryCode = attrs.country_code ?? null;
    } else if (isSubPayment) {
      orderId = attrs.order_id ?? data.id;
      variantId = attrs.variant_id != null ? String(attrs.variant_id) : undefined;
      total = attrs.total != null ? String(attrs.total) : null;
      currencyCode = attrs.currency ?? 'USD';
      userEmail = attrs.user_email ?? null;
    }

    let credits = 0;
    let packId: string | null = null;
    let packName: string | null = null;
    if (variantId) {
      const { data: pack } = await admin
        .from('pricing_packs')
        .select('id, credits_amount, name')
        .eq('lemon_squeezy_variant_id', variantId)
        .maybeSingle();
      if (pack?.credits_amount != null && pack.credits_amount > 0) {
        credits = pack.credits_amount;
        packId = pack.id;
        packName = pack.name ?? null;
      }
    }

    const transactionId = orderId ?? eventId;

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
          reference_id: String(eventId),
        });
      }
    }

    await admin
      .from('lemon_squeezy_sales')
      .upsert(
        {
          transaction_id: String(transactionId),
          event_id: String(eventId),
          user_id: userId || null,
          pack_id: packId,
          pack_name: packName,
          credits_amount: credits,
          amount: total,
          currency_code: currencyCode,
          country_code: countryCode,
          customer_email: userEmail,
        },
        { onConflict: 'transaction_id', ignoreDuplicates: true }
      )
      .then(() => {})
      .catch(() => {});
  }

  return res.status(200).json({ received: true });
}
