import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Key, CheckCircle, XCircle, Loader2, RefreshCw, Shield } from 'lucide-react';

interface KeysStatus {
  replicate: boolean;
  paddle: boolean;
  lemonSqueezy: boolean;
  supabase: boolean;
}

export default function AdminKeys() {
  const [status, setStatus] = useState<KeysStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setError(null);
    setLoading(true);
    try {
      if (!supabase) {
        setError('Supabase bağlı değil.');
        setStatus(null);
        setLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setStatus(null);
        setError('Oturum yok');
        return;
      }
      const base = import.meta.env.VITE_APP_URL ? `https://${import.meta.env.VITE_APP_URL}` : window.location.origin;
      const res = await fetch(`${base}/api/admin/keys-status`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        setError(res.status === 403 ? 'Yetkiniz yok' : 'Durum alınamadı');
        setStatus(null);
        return;
      }
      const data = await res.json();
      setStatus(data);
    } catch {
      setError('İstek başarısız');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const cards: { key: keyof KeysStatus; label: string; description: string }[] = [
    { key: 'replicate', label: 'Replicate', description: 'Görsel (Imagen-4) ve yorum (Claude) API' },
    { key: 'lemonSqueezy', label: 'Lemon Squeezy', description: 'Ödeme webhook (kredi satışları)' },
    { key: 'paddle', label: 'Paddle', description: 'Ödeme (eski; Lemon Squeezy kullanılıyorsa opsiyonel)' },
    { key: 'supabase', label: 'Supabase', description: 'Veritabanı ve Auth (service role)' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">API & Anahtarlar</h1>
          <p className="text-gray-400 text-sm mt-1">Entegrasyonların yapılandırma durumu (anahtarlar sunucuda tutulur, burada sadece durum gösterilir)</p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Yenile
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-200 flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 mb-6">
        <div className="flex items-start gap-3 text-sm text-gray-400">
          <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-gray-300">Güvenlik</p>
            <p>API anahtarları yalnızca sunucu ortam değişkenlerinde (Vercel / .env) tutulur. Bu sayfa sadece ilgili anahtarın tanımlı olup olmadığını gösterir; değerler asla görüntülenmez.</p>
          </div>
        </div>
      </div>

      {loading && !status ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
          <p className="text-gray-400 text-sm">Durum kontrol ediliyor...</p>
        </div>
      ) : status ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map(({ key: k, label, description }) => (
            <div key={k} className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-800">
                    <Key className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{label}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {status[k] ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Tanımlı
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-medium">
                      <XCircle className="w-4 h-4" />
                      Eksik
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
