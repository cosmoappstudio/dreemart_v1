/** Google Analytics 4 – gtag.js utility. Configure with VITE_GA_MEASUREMENT_ID in .env */

declare global {
  interface Window {
    gtag?: (command: string, targetId: string, config?: Record<string, unknown>) => void;
    dataLayer?: unknown[];
  }
}

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

let initialized = false;

export function initAnalytics(): void {
  if (!MEASUREMENT_ID || typeof window === 'undefined') return;
  if (initialized) return;
  initialized = true;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer?.push(arguments);
  }
  window.gtag = gtag;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID, {
    send_page_view: false,
    anonymize_ip: true,
  });
}

export function pageView(path: string, title?: string): void {
  if (!MEASUREMENT_ID || !window.gtag) return;
  window.gtag('config', MEASUREMENT_ID, {
    page_path: path,
    page_title: title,
  });
}

export function trackEvent(eventName: string, params?: Record<string, string | number | boolean | unknown[]>): void {
  if (!MEASUREMENT_ID || !window.gtag) return;
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

/** GA4 e-commerce: begin_checkout (user clicks pack, opens payment) */
export function trackBeginCheckout(params: { value: number; currency?: string; items: Array<{ item_id: string; item_name: string; price: number; quantity?: number }> }): void {
  if (!MEASUREMENT_ID || !window.gtag) return;
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

/** GA4 e-commerce: purchase (for server-side or when payment confirmed) */
export function trackPurchase(params: { value: number; currency?: string; transaction_id?: string; items: Array<{ item_id: string; item_name: string; price: number; quantity?: number }> }): void {
  if (!MEASUREMENT_ID || !window.gtag) return;
  const { value, currency = 'USD', transaction_id, items } = params;
  const eventParams: Record<string, unknown> = {
    currency,
    value,
    items: items.map((i) => ({
      item_id: i.item_id,
      item_name: i.item_name,
      price: i.price,
      quantity: i.quantity ?? 1,
    })),
  };
  if (transaction_id) eventParams.transaction_id = transaction_id;
  window.gtag('event', 'purchase', eventParams);
}
