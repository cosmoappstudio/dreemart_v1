import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Check, ImageIcon } from 'lucide-react';

export default function AdminSite() {
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [noBackend, setNoBackend] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setNoBackend(true);
      setLoading(false);
      return;
    }
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'logo_url')
      .single()
      .then(({ data }) => {
        setLogoUrl(data?.value ?? '');
        setLoading(false);
      });
  }, []);

  const save = async () => {
    if (!supabase) return;
    setSaving(true);
    await supabase
      .from('site_settings')
      .upsert({ key: 'logo_url', value: logoUrl.trim(), updated_at: new Date().toISOString() }, { onConflict: 'key' });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
        <p className="text-gray-400 text-sm">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Site Ayarları</h1>
        <p className="text-gray-400 text-sm mt-1">
          Logo ve diğer site geneli ayarlar. Logo URL boş bırakılırsa varsayılan Moon ikonu + DreamInk yazısı kullanılır.
        </p>
      </div>

      {noBackend && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-200">
          Backend bağlı değil. Supabase tablosu: site_settings (key: logo_url)
        </div>
      )}

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden max-w-xl">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-indigo-400" />
          <h2 className="font-semibold text-white">Logo</h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Logo URL</label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-gray-500 mt-1">
              Header ve footer’da gösterilir. Önerilen: yatay logo, şeffaf arka plan (PNG). Boş = varsayılan ikon + metin.
            </p>
          </div>
          {logoUrl.trim() && (
            <div className="rounded-lg bg-gray-800/50 border border-gray-700 p-4 flex items-center justify-center min-h-[80px]">
              <img src={logoUrl.trim()} alt="Logo önizleme" className="max-h-14 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}
          <button
            onClick={save}
            disabled={saving || !supabase}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
            {saved ? 'Kaydedildi' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
