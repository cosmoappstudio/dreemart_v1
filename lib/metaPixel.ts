/** Meta Pixel: GTM dataLayer modu (önerilen) veya doğrudan fbq.
 * GTM: VITE_GTM_ID ayarla → event'ler dataLayer'a gider, GTM içinde Meta Pixel tag'i yapılandır.
 * Direct: Sadece VITE_META_PIXEL_ID → fbq ile doğrudan gönderim (yedek).
 */

declare global {
  interface Window {
    fbq?: (action: string, ...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
const GTM_ID = import.meta.env.VITE_GTM_ID as string | undefined;

const USE_GTM = !!GTM_ID;

let fbqInitialized = false;

/** Meta reklamından gelen fbclid'i yakala ve _fbc cookie'sine yaz. Event Match Quality için kritik.
 * Format: fb.1.{timestamp}.{fbclid} - Meta dokümanlarına uygun. */
function captureFbclid(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get('fbclid');
    if (fbclid && fbclid.length > 0) {
      const fbc = `fb.1.${Date.now()}.${fbclid}`;
      document.cookie = `_fbc=${encodeURIComponent(fbc)}; path=/; max-age=7776000; SameSite=Lax`;
    }
  } catch {
    // ignore
  }
}

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

function pushToDataLayer(payload: { event: string; metaEvent: string; metaParams?: Record<string, unknown> }) {
  if (typeof window === 'undefined' || !window.dataLayer) return;
  window.dataLayer.push(payload);
}

export function initMetaTracking(): void {
  if (typeof window === 'undefined') return;
  captureFbclid(); // Event Match Quality: fbclid → _fbc cookie (Click ID coverage)
  if (USE_GTM) {
    window.dataLayer = window.dataLayer || [];
    return;
  }
  if (!PIXEL_ID || fbqInitialized) return;
  fbqInitialized = true;
  const fbq = createFbq();
  (window as { fbq: typeof fbq }).fbq = fbq;
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);
  fbq('init', PIXEL_ID);
}

/** Advanced Matching: Purchase event'te email + external_id → Event Match Quality artışı (~%100 em, ~%75 fbc).
 * Login sonrası çağrılmalı. GTM: metaUserData event'i tetiklenir; GTM'de bu event için fbq('init', id, userData) tag'i eklenmeli. */
export function setMetaUserData(email: string | null | undefined, externalId: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  const em = email?.trim().toLowerCase();
  const ext = externalId?.trim();
  if (USE_GTM) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'metaUserData', metaUserData: em || ext ? { ...(em && { em }), ...(ext && { external_id: ext }) } : {} });
    return;
  }
  if (!PIXEL_ID || !window.fbq) return;
  if (!em && !ext) {
    (window.fbq as (a: string, b: string) => void)('init', PIXEL_ID);
    return;
  }
  const userData: Record<string, string> = {};
  if (em) userData.em = em;
  if (ext) userData.external_id = ext;
  (window.fbq as (a: string, b: string, c?: Record<string, string>) => void)('init', PIXEL_ID, userData);
}

/** Logout'ta user data temizle (sonraki ziyaretçi önceki kullanıcıyla eşleşmesin) */
export function clearMetaUserData(): void {
  setMetaUserData(null, null);
}

export function metaPageView(): void {
  if (USE_GTM) {
    pushToDataLayer({ event: 'metaPixel', metaEvent: 'PageView', metaParams: {} });
    return;
  }
  if (!PIXEL_ID || !window.fbq) return;
  window.fbq('track', 'PageView');
}

export function metaViewContent(params: { content_ids?: string[]; content_type?: string; value?: number; currency?: string }): void {
  const p = {
    content_ids: params.content_ids ?? [],
    content_type: params.content_type ?? 'product',
    value: params.value ?? 0,
    currency: params.currency ?? 'USD',
  };
  if (USE_GTM) {
    pushToDataLayer({ event: 'metaPixel', metaEvent: 'ViewContent', metaParams: p });
    return;
  }
  if (!PIXEL_ID || !window.fbq) return;
  window.fbq('track', 'ViewContent', p);
}

export function metaInitiateCheckout(params: { content_ids?: string[]; content_type?: string; value?: number; currency?: string; num_items?: number }): void {
  const p = {
    content_ids: params.content_ids ?? [],
    content_type: params.content_type ?? 'product',
    value: params.value ?? 0,
    currency: params.currency ?? 'USD',
    num_items: params.num_items ?? 1,
  };
  if (USE_GTM) {
    pushToDataLayer({ event: 'metaPixel', metaEvent: 'InitiateCheckout', metaParams: p });
    return;
  }
  if (!PIXEL_ID || !window.fbq) return;
  window.fbq('track', 'InitiateCheckout', p);
}

export function metaPurchase(params: { content_ids?: string[]; content_type?: string; value?: number; currency?: string; order_id?: string; num_items?: number }): void {
  const p = {
    content_ids: params.content_ids ?? [],
    content_type: params.content_type ?? 'product',
    value: params.value ?? 0,
    currency: params.currency ?? 'USD',
    order_id: params.order_id,
    num_items: params.num_items ?? 1,
  };
  if (USE_GTM) {
    pushToDataLayer({ event: 'metaPixel', metaEvent: 'Purchase', metaParams: p });
    return;
  }
  if (!PIXEL_ID || !window.fbq) return;
  window.fbq('track', 'Purchase', p);
}

export function metaLead(): void {
  if (USE_GTM) {
    pushToDataLayer({ event: 'metaPixel', metaEvent: 'Lead', metaParams: {} });
    return;
  }
  if (!PIXEL_ID || !window.fbq) return;
  window.fbq('track', 'Lead');
}

export function metaTrackCustom(eventName: string, params?: Record<string, string | number | boolean>): void {
  const p = (params ?? {}) as Record<string, unknown>;
  if (USE_GTM) {
    pushToDataLayer({ event: 'metaPixel', metaEvent: eventName, metaParams: p });
    return;
  }
  if (!PIXEL_ID || !window.fbq) return;
  window.fbq('trackCustom', eventName, p); // params undefined olmasın diye p kullan
}
