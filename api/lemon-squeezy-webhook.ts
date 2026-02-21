import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');
  return createClient(url, key);
}

function jsonResponse(obj: object, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function sendGa4Purchase(params: {
  userId: string | null;
  transactionId: string;
  value: number;
  currency: string;
  packId: string | null;
  packName: string | null;
}) {
  const measurementId = process.env.VITE_GA_MEASUREMENT_ID || process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_MEASUREMENT_PROTOCOL_SECRET;
  if (!measurementId || !apiSecret) return;
  const clientId = params.userId ? `user-${params.userId}` : `anon-${params.transactionId}`;
  const valueNum = typeof params.value === 'number' ? params.value : parseFloat(String(params.value)) || 0;
  const currency = params.currency || 'USD';
  const payload = {
    client_id: clientId,
    user_id: params.userId || undefined,
    events: [
      {
        name: 'purchase',
        params: {
          currency,
          value: valueNum,
          transaction_id: params.transactionId,
          items: [
            {
              item_id: params.packId || 'unknown',
              item_name: params.packName || 'Credit Pack',
              price: valueNum,
              quantity: 1,
            },
          ],
        },
      },
    ],
  };
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;
  try {
    await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
  } catch {
    // ignore GA4 errors, do not fail webhook
  }
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-signature');
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return jsonResponse({ error: 'Webhook not configured' }, 400);
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const expected = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (expected.length !== signature.length) {
    return jsonResponse({ error: 'Invalid signature' }, 401);
  }
  const sigBytes = encoder.encode(signature);
  const expBytes = encoder.encode(expected);
  let equal = true;
  for (let i = 0; i < sigBytes.length; i++) {
    if (sigBytes[i] !== expBytes[i]) {
      equal = false;
      break;
    }
  }
  if (!equal) {
    return jsonResponse({ error: 'Invalid signature' }, 401);
  }

  const body = JSON.parse(rawBody);
  const eventName = req.headers.get('x-event-name') || body?.meta?.event_name;
  const eventId = body?.data?.id ?? body?.meta?.event_name + '-' + Date.now();

  const admin = getSupabaseAdmin();
  const { data: existing } = await admin
    .from('lemon_squeezy_webhook_events')
    .select('id')
    .eq('id', String(eventId))
    .single();
  if (existing) {
    return jsonResponse({ received: true }, 200);
  }

  await admin.from('lemon_squeezy_webhook_events').insert({ id: String(eventId) });

  const isOrder = eventName === 'order_created';
  const isSubPayment =
    eventName === 'subscription_payment_success' || eventName === 'subscription_payment_succeeded';

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
        const updatePayload: {
          credits: number;
          updated_at: string;
          last_purchased_pack_id?: string | null;
        } = {
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

    await admin.from('lemon_squeezy_sales').upsert(
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
    );

    // Lemon Squeezy total is in cents
    const rawTotal = total != null ? Number(total) : 0;
    const valueNum = !isNaN(rawTotal) && rawTotal >= 0 ? rawTotal / 100 : 0;
    if (valueNum > 0) {
      await sendGa4Purchase({
        userId: userId || null,
        transactionId: String(transactionId),
        value: valueNum,
        currency: currencyCode,
        packId,
        packName,
      });
    }
  }

  return jsonResponse({ received: true }, 200);
}
