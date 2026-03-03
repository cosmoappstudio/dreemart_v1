/** Dil + URL senkronizasyonu. Tüm query param'lar (fbclid, utm_*, vb.) korunur. */
import type { Language } from '../types';

const LANG_PARAM = 'lang';

/** Mevcut query string'den tracking param'ları koruyarak lang ekler/günceller */
export function buildUrlWithLang(pathname: string, search: string, lang: Language): string {
  const params = new URLSearchParams(search);
  params.set(LANG_PARAM, lang);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** URL'den dil oku; geçersizse defaultLang dön */
export function getLangFromSearch(search: string, defaultLang: Language = 'tr'): Language {
  const params = new URLSearchParams(search);
  const l = params.get(LANG_PARAM);
  if (l === 'tr' || l === 'en' || l === 'es' || l === 'de') return l;
  return defaultLang;
}
