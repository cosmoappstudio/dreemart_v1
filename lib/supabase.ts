import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn('Supabase env missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = url && anonKey
  ? createClient(url, anonKey, {
      auth: { detectSessionInUrl: true },
    })
  : null;

export function getApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return p;
}
