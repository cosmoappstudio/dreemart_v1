/** Google Analytics 4 + Google Ads – gtag.js utility. Configure with VITE_GA_MEASUREMENT_ID in .env */

declare global {
  interface Window {
    gtag?: (command: string, targetId: string, config?: Record<string, unknown>) => void;
    dataLayer?: unknown[];
  }
}

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const GOOGLE_ADS_ID = import.meta.env.VITE_GOOGLE_ADS_ID || 'AW-17971753030';

let initialized = false;

export function initAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (initialized) return;
  initialized = true;

  const primaryId = MEASUREMENT_ID || GOOGLE_ADS_ID;
  if (!primaryId) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer?.push(arguments);
  }
  window.gtag = gtag;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${primaryId}`;
  document.head.appendChild(script);

  gtag('js', new Date());
  if (MEASUREMENT_ID) {
    gtag('config', MEASUREMENT_ID, { send_page_view: false, anonymize_ip: true });
  }
  if (GOOGLE_ADS_ID && GOOGLE_ADS_ID !== MEASUREMENT_ID) {
    gtag('config', GOOGLE_ADS_ID);
  }
}

export function pageView(path: string, title?: string): void {
  if (!MEASUREMENT_ID || !window.gtag) return;
  window.gtag('config', MEASUREMENT_ID, {
    page_path: path,
    page_title: title,
  });
}

/** GA4 + Google Ads: download_clicked, cta_click, paywall_opened, dream_generated, login, share_clicked vb. */
export function trackEvent(eventName: string, params?: Record<string, string | number | boolean | unknown[]>): void {
  if (!window.gtag) return;
  window.gtag('event', eventName, params);
}

/** GA4 e-commerce: view_item_list (user sees credit packs) */
export function trackViewItemList(params: { items: Array<{ item_id: string; item_name: string; price: number }>; currency?: string }): void {
  if (!MEASUREMENT_ID || !window.gtag) return;
  const { items, currency = 'USD' } = params;
  window.gtag('event', 'view_item_list', {
    currency,
    items: items.map((i) => ({ item_id: i.item_id, item_name: i.item_name, price: i.price })),
  });
}

/** GA4 + Google Ads: begin_checkout (user clicks pack, opens payment) */
export function trackBeginCheckout(params: { value: number; currency?: string; items: Array<{ item_id: string; item_name: string; price: number; quantity?: number }> }): void {
  if (!window.gtag) return;
  const { value, currency = 'USD', items } = params;
  window.gtag('event', 'begin_checkout', {
    currency,
    value,
    items: items.map((i) => ({
      item_id: i.item_id,
      item_name: i.item_name,
      price: i.price,
      quantity: i.quantity ?? 1,
    })),
  });
}

/** GA4 + Google Ads: purchase (client-side when payment confirmed). Params: currency, value, transaction_id, items (country içerebilir) */
export function trackPurchase(params: {
  value: number;
  currency?: string;
  transaction_id?: string;
  items: Array<{ item_id: string; item_name: string; price: number; quantity?: number; country?: string }>;
}): void {
  if (!window.gtag) return;
  const { value, currency = 'USD', transaction_id, items } = params;
  const eventParams: Record<string, unknown> = {
    currency,
    value,
    items: items.map((i) => {
      const item: Record<string, unknown> = {
        item_id: i.item_id,
        item_name: i.item_name,
        price: i.price,
        quantity: i.quantity ?? 1,
      };
      if (i.country) item.country = i.country;
      return item;
    }),
  };
  if (transaction_id) eventParams.transaction_id = transaction_id;
  window.gtag('event', 'purchase', eventParams);
}

const PENDING_PURCHASE_KEY = 'dreemart_pending_purchase';
const PENDING_MAX_AGE_MS = 60 * 60 * 1000; // 1 saat

/** Begin checkout çağrıldığında bekleyen satın alma bilgisini sakla (purchase event için).
 * localStorage kullanıyoruz: Lemon Squeezy popup'ta açıldığında success URL aynı origin'de
 * farklı sekmede yüklenir, sessionStorage paylaşılmaz; localStorage tüm sekmelerde ortaktır. */
export function setPendingPurchase(params: { packId: string; value: number; itemName: string; country?: string }): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      PENDING_PURCHASE_KEY,
      JSON.stringify({ ...params, ts: Date.now() })
    );
  } catch {
    // ignore
  }
}

/** Profile last_purchased_pack_id güncellendiğinde çağrılır; eşleşen pending varsa purchase event gönderir. orderId LS order ID (CAPI/Pixel dedup için) */
export function maybeTrackPurchaseFromPending(packId: string, orderId?: string): void {
  try {
    const raw = localStorage.getItem(PENDING_PURCHASE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as { packId: string; value: number; itemName: string; country?: string; ts: number };
    if (data.packId !== packId) return;
    if (Date.now() - data.ts > PENDING_MAX_AGE_MS) return;
    localStorage.removeItem(PENDING_PURCHASE_KEY);
    const item = { item_id: packId, item_name: data.itemName, price: data.value, country: data.country };
    const txId = orderId ?? `ls-${packId}-${data.ts}`;
    if (window.gtag) {
      trackPurchase({ value: data.value, currency: 'USD', transaction_id: txId, items: [item] });
    }
    import('./metaPixel').then(({ metaPurchase }) => {
      metaPurchase({ content_ids: [packId], content_type: 'product', value: data.value, currency: 'USD', order_id: txId, num_items: 1 });
    });
  } catch {
    localStorage.removeItem(PENDING_PURCHASE_KEY);
  }
}
