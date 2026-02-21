/** Meta Pixel (fbq) – client-side. Configure with VITE_META_PIXEL_ID in .env */

declare global {
  interface Window {
    fbq?: (action: string, ...args: unknown[]) => void;
  }
}

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;

let initialized = false;

function createFbq() {
  const queue: unknown[] = [];
  const n = function (this: unknown, ...args: unknown[]) {
    const f = n as typeof n & { callMethod?: (a: unknown) => void };
    if (f.callMethod) (f.callMethod as (...a: unknown[]) => void).apply(f, args);
    else queue.push(args);
  };
  (n as unknown as { queue: unknown[] }).queue = queue;
  (n as unknown as { version: string }).version = '2.0';
  (n as unknown as { loaded: boolean }).loaded = true;
  return n as ((...args: unknown[]) => void) & { queue: unknown[] };
}

export function initMetaPixel(): void {
  if (!PIXEL_ID || typeof window === 'undefined') return;
  if (initialized) return;
  initialized = true;

  const fbq = createFbq();
  (window as { fbq: typeof fbq }).fbq = fbq;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);

  fbq('init', PIXEL_ID);
  // PageView sent by metaPageView() on route change
}

export function metaPageView(): void {
  if (!PIXEL_ID || !window.fbq) return;
  window.fbq('track', 'PageView');
}

export function metaViewContent(params: { content_ids?: string[]; content_type?: string; value?: number; currency?: string }): void {
  if (!PIXEL_ID || !window.fbq) return;
  window.fbq('track', 'ViewContent', {
    content_ids: params.content_ids ?? [],
    content_type: params.content_type ?? 'product',
    value: params.value ?? 0,
    currency: params.currency ?? 'USD',
  });
}

export function metaInitiateCheckout(params: { content_ids?: string[]; content_type?: string; value?: number; currency?: string; num_items?: number }): void {
  if (!PIXEL_ID || !window.fbq) return;
  window.fbq('track', 'InitiateCheckout', {
    content_ids: params.content_ids ?? [],
    content_type: params.content_type ?? 'product',
    value: params.value ?? 0,
    currency: params.currency ?? 'USD',
    num_items: params.num_items ?? 1,
  });
}

export function metaPurchase(params: { content_ids?: string[]; content_type?: string; value?: number; currency?: string; order_id?: string; num_items?: number }): void {
  if (!PIXEL_ID || !window.fbq) return;
  window.fbq('track', 'Purchase', {
    content_ids: params.content_ids ?? [],
    content_type: params.content_type ?? 'product',
    value: params.value ?? 0,
    currency: params.currency ?? 'USD',
    order_id: params.order_id,
    num_items: params.num_items ?? 1,
  });
}

export function metaLead(): void {
  if (!PIXEL_ID || !window.fbq) return;
  window.fbq('track', 'Lead');
}

/** Custom events – GA ile aynı event'leri Meta'ya da gönderir */
export function metaTrackCustom(eventName: string, params?: Record<string, string | number | boolean>): void {
  if (!PIXEL_ID || !window.fbq) return;
  window.fbq('trackCustom', eventName, params);
}
