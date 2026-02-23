import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Check, ImageIcon, Upload, Share2, Gift, Shield, Plus, Trash2 } from 'lucide-react';

const SOCIAL_KEYS = [
  { key: 'social_instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { key: 'social_tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
  { key: 'social_facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
  { key: 'social_twitter', label: 'X (Twitter)', placeholder: 'https://x.com/...' },
  { key: 'social_youtube', label: 'YouTube', placeholder: 'https://youtube.com/@...' },
] as const;

const NEW_USER_CREDITS_KEY = 'new_user_credits';
const MAX_ACCOUNTS_PER_DEVICE_KEY = 'max_accounts_per_device';
const FREE_CREDITS_ARTIST_COUNT_KEY = 'free_credits_artist_count';

export default function AdminSite() {
  const [logoUrl, setLogoUrl] = useState('');
  const [newUserCredits, setNewUserCredits] = useState<number>(1);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [noBackend, setNoBackend] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [blockedDomains, setBlockedDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [domainError, setDomainError] = useState<string | null>(null);
  const [maxAccountsPerDevice, setMaxAccountsPerDevice] = useState<number>(1);
  const [freeCreditsArtistCount, setFreeCreditsArtistCount] = useState<number>(2);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabase) {
      setNoBackend(true);
      setLoading(false);
      return;
    }
    (async () => {
      const settingsRes = await supabase.from('site_settings').select('key, value').in('key', ['logo_url', NEW_USER_CREDITS_KEY, MAX_ACCOUNTS_PER_DEVICE_KEY, FREE_CREDITS_ARTIST_COUNT_KEY, ...SOCIAL_KEYS.map((s) => s.key)]);
      const rows = (settingsRes.data ?? []) as { key: string; value: string }[];
      const social: Record<string, string> = {};
      rows.forEach((r) => {
        if (r.key === 'logo_url') setLogoUrl(r.value ?? '');
        else if (r.key === NEW_USER_CREDITS_KEY) {
          const n = parseInt(r.value ?? '1', 10);
          setNewUserCredits(Number.isFinite(n) && n >= 0 ? n : 1);
        } else if (r.key === MAX_ACCOUNTS_PER_DEVICE_KEY) {
          const m = parseInt(r.value ?? '1', 10);
          setMaxAccountsPerDevice(Number.isFinite(m) && m >= 1 ? m : 1);
        } else if (r.key === FREE_CREDITS_ARTIST_COUNT_KEY) {
          const f = parseInt(r.value ?? '2', 10);
          setFreeCreditsArtistCount(Number.isFinite(f) && f >= 1 ? f : 2);
        } else social[r.key] = r.value ?? '';
      });
      setSocialLinks(social);
      const domainsRes = await supabase.from('blocked_email_domains').select('domain').order('domain');
      if (!domainsRes.error) setBlockedDomains((domainsRes.data ?? []).map((r: { domain: string }) => r.domain));
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!supabase) return;
    setSaving(true);
    const credits = Math.max(0, Math.floor(newUserCredits));
    setNewUserCredits(credits);
    const updates = [
      { key: 'logo_url', value: logoUrl.trim() },
      { key: NEW_USER_CREDITS_KEY, value: String(credits) },
      { key: MAX_ACCOUNTS_PER_DEVICE_KEY, value: String(Math.max(1, Math.floor(maxAccountsPerDevice))) },
      { key: FREE_CREDITS_ARTIST_COUNT_KEY, value: String(Math.max(1, Math.floor(freeCreditsArtistCount))) },
      ...Object.entries(socialLinks).map(([key, value]) => ({ key, value: value.trim() })),
    ];
    for (const u of updates) {
      await supabase.from('site_settings').upsert({ key: u.key, value: u.value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addBlockedDomain = async () => {
    if (!supabase) return;
    const d = newDomain.trim().toLowerCase().replace(/^@/, '').replace(/.*@/, '');
    if (!d) {
      setDomainError('Geçerli bir domain girin (örn: tempmail.com)');
      return;
    }
    if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(d)) {
      setDomainError('Geçersiz domain formatı');
      return;
    }
    setDomainError(null);
    const { error } = await supabase.from('blocked_email_domains').insert({ domain: d });
    if (error) {
      setDomainError(error.code === '23505' ? 'Bu domain zaten listede' : error.message);
      return;
    }
    setBlockedDomains((prev) => [...prev, d].sort());
    setNewDomain('');
  };

  const removeBlockedDomain = async (domain: string) => {
    if (!supabase) return;
    await supabase.from('blocked_email_domains').delete().eq('domain', domain);
    setBlockedDomains((prev) => prev.filter((d) => d !== domain));
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

      {/* Engellenen email domain'leri */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden max-w-xl">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          <h2 className="font-semibold text-white">Engellenen Email Domain&apos;leri</h2>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-400">
            Bu listedeki domain&apos;lerle kayıt olan kullanıcılar <strong>0 kredi</strong> ile başlar. Geçici (tempmail, guerrillamail vb.) domain&apos;leri engelleyerek çoklu hesap açma kötüye kullanımını azaltın.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => { setNewDomain(e.target.value); setDomainError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && addBlockedDomain()}
              placeholder="tempmail.com"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm lowercase"
            />
            <button
              type="button"
              onClick={addBlockedDomain}
              disabled={!supabase}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-500 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Ekle
            </button>
          </div>
          {domainError && <p className="text-sm text-red-400">{domainError}</p>}
          <div className="max-h-48 overflow-y-auto rounded-lg bg-gray-800/50 border border-gray-700 p-2 flex flex-wrap gap-2">
            {blockedDomains.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">Henüz engellenen domain yok.</p>
            ) : (
              blockedDomains.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-700 text-gray-200 text-xs"
                >
                  {d}
                  <button
                    type="button"
                    onClick={() => removeBlockedDomain(d)}
                    className="p-0.5 rounded hover:bg-gray-600 text-gray-400 hover:text-red-400"
                    aria-label={`${d} kaldır`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Yeni kullanıcı kredisi */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden max-w-xl">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
          <Gift className="w-5 h-5 text-indigo-400" />
          <h2 className="font-semibold text-white">Yeni Kullanıcı Kredisi</h2>
        </div>
        <div className="p-4">
          <label className="block text-xs font-medium text-gray-400 mb-2">Yeni kayıt olan kullanıcıların başlangıç kredisi</label>
          <input
            type="number"
            min={0}
            value={newUserCredits}
            onChange={(e) => setNewUserCredits(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          />
          <p className="text-xs text-gray-500 mt-2">0 veya daha fazla. Değişiklik sadece yeni kayıt olanlara uygulanır.</p>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <label className="block text-xs font-medium text-gray-400 mb-2">Cihaz başına maksimum hesap</label>
            <input
              type="number"
              min={1}
              max={5}
              value={maxAccountsPerDevice}
              onChange={(e) => setMaxAccountsPerDevice(Math.max(1, Math.min(5, parseInt(e.target.value, 10) || 1)))}
              className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">1 = aynı cihazda ikinci hesap 0 kredi alır. 2+ = paylaşılan bilgisayar için.</p>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <label className="block text-xs font-medium text-gray-400 mb-2">Ücretsiz kredilerde kullanılabilir ressam sayısı</label>
            <input
              type="number"
              min={1}
              max={20}
              value={freeCreditsArtistCount}
              onChange={(e) => setFreeCreditsArtistCount(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 2)))}
              className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">Satın alma yapmamış kullanıcılar sadece ilk N ressamı kullanabilir. Kredi alınca tümü açılır.</p>
          </div>
        </div>
      </div>

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
