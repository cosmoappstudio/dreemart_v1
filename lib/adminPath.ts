/**
 * Admin panel path – gizli URL (tahmin edilmesi zor).
 * Vercel/env: VITE_ADMIN_PATH=yonetimofisi (veya farklı bir slug).
 * Varsayılan: yonetimofisi
 */
export const ADMIN_PATH = (typeof import.meta !== 'undefined' && (import.meta as { env?: { VITE_ADMIN_PATH?: string } }).env?.VITE_ADMIN_PATH) || 'yonetimofisi';

export function adminRoute(path: string): string {
  if (path === '/admin' || path === '') return `/${ADMIN_PATH}`;
  return `/${ADMIN_PATH}${path.replace(/^\/admin/, '')}`;
}
