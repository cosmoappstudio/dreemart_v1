import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn('Supabase env missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export function getApiUrl(path: string): string {
  const base = import.meta.env.VITE_APP_URL || import.meta.env.VERCEL_URL || '';
  const prefix = base ? `https://${base}` : '';
  return prefix ? `${prefix}${path}` : path.startsWith('/') ? `${window.location.origin}${path}` : path;
}
