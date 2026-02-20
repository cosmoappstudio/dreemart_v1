import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Check, ImageIcon, Upload, Share2 } from 'lucide-react';

const SOCIAL_KEYS = [
  { key: 'social_instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { key: 'social_tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
  { key: 'social_facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
  { key: 'social_twitter', label: 'X (Twitter)', placeholder: 'https://x.com/...' },
  { key: 'social_youtube', label: 'YouTube', placeholder: 'https://youtube.com/@...' },
] as const;

export default function AdminSite() {
  const [logoUrl, setLogoUrl] = useState('');
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [noBackend, setNoBackend] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabase) {
      setNoBackend(true);
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase.from('site_settings').select('key, value').in('key', ['logo_url', ...SOCIAL_KEYS.map((s) => s.key)]);
      const rows = (data ?? []) as { key: string; value: string }[];
      const social: Record<string, string> = {};
      rows.forEach((r) => {
        if (r.key === 'logo_url') setLogoUrl(r.value ?? '');
        else social[r.key] = r.value ?? '';
      });
      setSocialLinks(social);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!supabase) return;
    setSaving(true);
    const updates = [
      { key: 'logo_url', value: logoUrl.trim() },
      ...Object.entries(socialLinks).map(([key, value]) => ({ key, value: value.trim() })),
    ];
    for (const u of updates) {
      await supabase.from('site_settings').upsert({ key: u.key, value: u.value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const uploadLogo = async (file: File) => {
    if (!supabase) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setUploadError('Sadece JPG, PNG, WebP veya GIF yükleyebilirsiniz.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Dosya 2 MB\'dan küçük olmalı.');
      return;
    }
    setUploadError(null);
    setUploadingLogo(true);
    const ext = file.name.split('.').pop() || 'png';
    const path = `logo.${ext}`;
    const { error } = await supabase.storage.from('site-assets').upload(path, file, { upsert: true });
    if (error) {
      setUploadError(error.message === 'Bucket not found' ? 'Storage bucket "site-assets" yok. 016 migration\'ı çalıştırın.' : error.message);
      setUploadingLogo(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('site-assets').getPublicUrl(path);
    const url = urlData?.publicUrl ?? '';
    setLogoUrl(url);
    await supabase.from('site_settings').upsert({ key: 'logo_url', value: url, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    setUploadingLogo(false);
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Site Ayarları</h1>
        <p className="text-gray-400 text-sm mt-1">
          Logo, sosyal medya linkleri ve diğer site ayarları.
        </p>
      </div>

      {noBackend && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-200">
          Backend bağlı değil.
        </div>
      )}

      {/* Logo */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden max-w-xl">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-indigo-400" />
          <h2 className="font-semibold text-white">Logo</h2>
        </div>
        <div className="p-4 space-y-4">
          <input type="file" ref={logoInputRef} accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ''; }} />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo || !supabase}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
            >
              {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploadingLogo ? 'Yükleniyor...' : 'Dosyadan Yükle'}
            </button>
            <span className="text-xs text-gray-500 self-center">veya URL ile:</span>
          </div>
          {uploadError && <p className="text-sm text-red-400">{uploadError}</p>}
          <div>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-gray-500 mt-1">Header ve footer’da gösterilir. Boş = varsayılan ikon.</p>
          </div>
          {logoUrl.trim() && (
            <div className="rounded-lg bg-gray-800/50 border border-gray-700 p-4 flex items-center justify-center min-h-[80px]">
              <img src={logoUrl.trim()} alt="Logo önizleme" className="max-h-14 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}
        </div>
      </div>

      {/* Sosyal medya */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden max-w-xl">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
          <Share2 className="w-5 h-5 text-indigo-400" />
          <h2 className="font-semibold text-white">Sosyal Medya (Footer)</h2>
        </div>
        <div className="p-4 space-y-3">
          {SOCIAL_KEYS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
              <input
                type="url"
                value={socialLinks[key] ?? ''}
                onChange={(e) => setSocialLinks((s) => ({ ...s, [key]: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving || !supabase}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
        {saved ? 'Kaydedildi' : 'Tümünü Kaydet'}
      </button>
    </div>
  );
}
