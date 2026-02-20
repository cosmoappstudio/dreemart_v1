import type { VercelRequest, VercelResponse } from '@vercel/node';

const LEMON_API = 'https://api.lemonsqueezy.com/v1/checkouts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
  if (!apiKey || !storeId) {
    return res.status(503).json({ error: 'Checkout not configured' });
  }

  const userId = (req.body as { user_id?: string })?.user_id;
  const variantIdRaw = (req.body as { variant_id?: string | number })?.variant_id;
  if (!userId || variantIdRaw == null) {
    return res.status(400).json({ error: 'user_id and variant_id required' });
  }
  const variantId = typeof variantIdRaw === 'number' ? variantIdRaw : parseInt(String(variantIdRaw), 10);
  if (!Number.isFinite(variantId)) {
    return res.status(400).json({ error: 'Invalid variant_id' });
  }

  const payload = {
    data: {
      type: 'checkouts',
      attributes: {
        product_options: {
          enabled_variants: [variantId],
        },
        checkout_data: {
          custom: { user_id: userId },
        },
      },
      relationships: {
        store: { data: { type: 'stores', id: String(storeId) } },
        variant: { data: { type: 'variants', id: String(variantId) } },
      },
    },
  };

  const apiRes = await fetch(LEMON_API, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!apiRes.ok) {
    const err = await apiRes.text();
    console.error('Lemon Squeezy checkout error', apiRes.status, err);
    return res.status(502).json({ error: 'Could not create checkout' });
  }

  const data = (await apiRes.json()) as { data?: { attributes?: { url?: string } } };
  const url = data?.data?.attributes?.url;
  if (!url) {
    return res.status(502).json({ error: 'No checkout URL in response' });
  }

  return res.status(200).json({ url });
}
