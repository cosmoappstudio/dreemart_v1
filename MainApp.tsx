import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import { ARTISTS as FALLBACK_ARTISTS } from './constants';
import { Artist, LoadingState, DreamRecord, Language } from './types';
import { TRANSLATIONS } from './translations';
import { Link } from 'react-router-dom';
import { ADMIN_PATH } from './lib/adminPath';
import { Sparkles, Moon, Share2, X, Stars, User, Home, Crown, CheckCircle2, Zap, History, LayoutGrid, Calendar, Globe, LogOut, AlertCircle, RefreshCw, Palette, Award, ChevronDown, ChevronLeft, ChevronRight, Settings, Download } from 'lucide-react';
import { LEGAL_LINK_LABELS } from './landingTranslations';

const LANGUAGE_OPTIONS: { code: Language; flag: string; label: string }[] = [
  { code: 'tr', flag: '🇹🇷', label: 'Türkçe' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
];

function mapDbArtist(row: { id: string; name: string; style_description: string; image_url: string }): Artist {
  return {
    id: row.id,
    name: row.name,
    styleDescription: row.style_description,
    imageUrl: row.image_url,
  };
}

function mapDbDream(row: { id: string; created_at: string; prompt: string; image_url: string | null; interpretation: string | null; artists: { name: string } | null }): DreamRecord {
  return {
    id: row.id,
    date: row.created_at,
    prompt: row.prompt,
    imageUrl: row.image_url || '',
    interpretation: row.interpretation || '',
    artistName: row.artists?.name || '',
  };
}

/** Dışarıda tanımlı; her tuşta MainApp re-render olsa bile textarea yeniden mount olmaz, focus kaybolmaz. */
function DreamTextarea({
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxLength: number;
}) {
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full min-h-[10rem] h-40 bg-white/5 border border-white/10 rounded-2xl p-4 text-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-500/30 resize-none transition-colors"
      />
      <span className="absolute bottom-3 right-4 text-xs text-gray-500 font-mono">{value.length}/{maxLength}</span>
    </div>
  );
}

export default function MainApp() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'gallery' | 'profile'>('home');
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(!!supabase);
  const [dreams, setDreams] = useState<DreamRecord[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallView, setPaywallView] = useState<'credits'>('credits');
  const [dreamText, setDreamText] = useState('');
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [showSuccessView, setShowSuccessView] = useState(false);
  const [selectedDreamStart, setSelectedDreamStart] = useState<DreamRecord | null>(null);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [creditPacksFromDb, setCreditPacksFromDb] = useState<{ id: string; name: string; price: string; credits_text: string; badge: string | null; lemon_squeezy_variant_id?: string | null; lemon_squeezy_checkout_uuid?: string | null }[]>([]);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const language = (profile?.language || 'tr') as Language;
  const currentLangOption = LANGUAGE_OPTIONS.find((o) => o.code === language) ?? LANGUAGE_OPTIONS[0];
  const t = (key: string) => TRANSLATIONS[language]?.[key] || key;
  const credits = profile?.credits ?? 0;
  const tier = (profile?.tier === 'pro' ? 'PRO' : 'FREE') as 'FREE' | 'PRO';

  // Load artists from Supabase or use fallback (frontend-only)
  useEffect(() => {
    if (!supabase) {
      setArtists(FALLBACK_ARTISTS);
      setSelectedArtist(FALLBACK_ARTISTS[0] ?? null);
      setArtistsLoading(false);
      return;
    }
    supabase.from('artists').select('id, name, style_description, image_url').eq('is_active', true).order('sort_order').then(({ data }) => {
      const list = (data || []).map(mapDbArtist);
      setArtists(list.length > 0 ? list : FALLBACK_ARTISTS);
      setSelectedArtist(list.length > 0 ? list[0] : FALLBACK_ARTISTS[0] ?? null);
      setArtistsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user?.id || !supabase) return;
    supabase.from('dreams').select('id, created_at, prompt, image_url, interpretation, artists(name)').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => {
      const rows = (data || []) as Array<{ id: string; created_at: string; prompt: string; image_url: string | null; interpretation: string | null; artists?: { name: string } | { name: string }[] | null }>;
      setDreams(rows.map((r) => mapDbDream({
        id: r.id,
        created_at: r.created_at,
        prompt: r.prompt,
        image_url: r.image_url,
        interpretation: r.interpretation,
        artists: Array.isArray(r.artists) ? (r.artists[0] ?? null) : r.artists ?? null,
      })));
    });
  }, [user?.id]);

  // İlk yüklemede profil çek (Realtime subscription AuthContext'te – admin kredi vb. anında gelir)
  useEffect(() => {
    if (!user?.id) return;
    refreshProfile();
  }, [user?.id]);

  // Profil sekmesine geçildiğinde Supabase'den en güncel veriyi çek (username vb.)
  useEffect(() => {
    if (activeTab === 'profile' && user?.id) refreshProfile();
  }, [activeTab]);

  // Kredi paketleri: Admin/landing ile aynı kaynak (pricing_packs); Lemon Squeezy variant_id checkout için
  useEffect(() => {
    if (!supabase) return;
    supabase.from('pricing_packs').select('id, name, price, credits_text, badge, sort_order, lemon_squeezy_variant_id, lemon_squeezy_checkout_uuid').order('sort_order').then(({ data }) => {
      if (data?.length) setCreditPacksFromDb(data as { id: string; name: string; price: string; credits_text: string; badge: string | null; lemon_squeezy_variant_id?: string | null; lemon_squeezy_checkout_uuid?: string | null }[]);
    });
  }, []);

  const handleGenerate = async () => {
    if (!dreamText.trim() || !selectedArtist || !user) return;
    if (tier === 'FREE' && credits <= 0) {
      setPaywallView('credits');
      setShowPaywall(true);
      return;
    }
    setGenerateError(null);
    setLoadingState(LoadingState.GENERATING_IMAGE);
    setGeneratedImage(null);
    setInterpretation(null);

    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data?.session?.access_token;
      if (!token) throw new Error('Not signed in');
      const base = (import.meta.env.VITE_APP_URL && !import.meta.env.VITE_APP_URL.startsWith('http')) ? `https://${import.meta.env.VITE_APP_URL}` : (import.meta.env.VITE_APP_URL || window.location.origin);
      const res = await fetch(`${base}/api/generate-dream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          dreamText: dreamText.trim(),
          artistId: selectedArtist.id,
          language: profile?.language || 'tr',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 402) {
          setPaywallView('credits');
          setShowPaywall(true);
        }
        throw new Error(data.error || 'Failed');
      }
      setGeneratedImage(data.imageUrl);
      setInterpretation(data.interpretation);
      setLoadingState(LoadingState.COMPLETE);
      setDreams(prev => [{
        id: data.id,
        date: data.createdAt,
        prompt: dreamText.trim(),
        imageUrl: data.imageUrl,
        interpretation: data.interpretation,
        artistName: data.artistName,
      }, ...prev]);
      setShowSuccessView(true);
      // Kredileri güncellemek için kısa gecikme; aynı anda focus vs. tetiklenmesin
      setTimeout(() => refreshProfile(), 1500);
    } catch (e) {
      console.error(e);
      setLoadingState(LoadingState.ERROR);
      setGenerateError(e instanceof Error ? e.message : t('errorGeneric'));
    }
  };

  const handlePurchase = async (planId: string) => {
    setCheckoutError(null);
    const pack = creditPacksFromDb.find((p) => p.id === planId);
    const variantId = pack && 'lemon_squeezy_variant_id' in pack ? pack.lemon_squeezy_variant_id : null;
    const variantIdNum = variantId != null ? (typeof variantId === 'string' ? variantId.trim() : String(variantId)) : '';
    // Lemon Squeezy: API ile checkout URL oluştur (UUID değiştiği için sabit link yerine)
    if (variantIdNum && user?.id) {
      const base = (import.meta.env.VITE_APP_URL && !import.meta.env.VITE_APP_URL.startsWith('http')) ? `https://${import.meta.env.VITE_APP_URL}` : (import.meta.env.VITE_APP_URL || window.location.origin);
      try {
        const res = await fetch(`${base}/api/lemon-squeezy-create-checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, variant_id: variantIdNum }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.url) {
          const w = window.open(data.url);
          if (w) setShowPaywall(false);
          else setCheckoutError(language === 'tr' ? 'Popup engellendi. Lütfen tarayıcıda açılır pencerelere izin verin.' : 'Popup blocked. Please allow popups for this site.');
          return;
        }
      } catch {
        setCheckoutError(language === 'tr' ? 'Ödeme sayfası açılamadı. Lütfen tekrar deneyin.' : 'Could not open checkout. Please try again.');
        return;
      }
    }
    const checkoutUrl = import.meta.env.VITE_PADDLE_CHECKOUT_URL;
    if (checkoutUrl) {
      const url = new URL(checkoutUrl);
      url.searchParams.set('user_id', user?.id || '');
      url.searchParams.set('product', planId);
      const w = window.open(url.toString());
      if (w) setShowPaywall(false);
      else setCheckoutError(language === 'tr' ? 'Popup engellendi. Lütfen tarayıcıda açılır pencerelere izin verin.' : 'Popup blocked. Please allow popups for this site.');
      return;
    }
    setCheckoutError(language === 'tr' ? 'Ödeme sayfası şu an hazır değil. Lütfen daha sonra tekrar deneyin.' : 'Checkout is not configured. Please try again later.');
  };

  const updateLanguage = async (lang: Language) => {
    if (!user?.id || !supabase) return;
    try {
      await supabase.from('profiles').update({ language: lang, updated_at: new Date().toISOString() }).eq('id', user.id);
      await refreshProfile();
    } catch {
      // ignore when backend not ready
    }
  };

  const handleDownload = async (imageUrl: string, filename = 'dreemart-dream.png') => {
    try {
      const res = await fetch(imageUrl, { mode: 'cors' });
      if (!res.ok) throw new Error('Failed to fetch');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(imageUrl, '_blank');
    }
  };

  const handleShare = async (imageUrl: string, title?: string) => {
    const shareData: ShareData = { title: title || 'Dreemart', text: title ? `${title} - Dreemart` : 'Dreemart ile oluşturduğum rüya sanatı' };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const res = await fetch(imageUrl, { mode: 'cors' });
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], 'dreemart-dream.png', { type: blob.type });
          await navigator.share({ ...shareData, files: [file] });
          return;
        }
      } catch {
        // Fallback: share URL only
      }
      try {
        await navigator.share({ ...shareData, url: imageUrl });
      } catch {
        try {
          await navigator.clipboard.writeText(imageUrl);
          alert(language === 'tr' ? 'Görsel linki panoya kopyalandı.' : 'Image link copied to clipboard.');
        } catch {
          window.open(imageUrl, '_blank');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(imageUrl);
        alert(language === 'tr' ? 'Görsel linki panoya kopyalandı.' : 'Image link copied to clipboard.');
      } catch {
        window.open(imageUrl, '_blank');
      }
    }
  };

  const getCreditPacks = () => {
    if (creditPacksFromDb.length > 0) {
      return creditPacksFromDb.map((p) => ({
        id: p.id,
        title: p.name,
        price: p.price,
        features: [p.credits_text, t('featStandardSpeed')],
        recommended: !!p.badge,
      }));
    }
    return [
      { id: 'credits_10', title: t('credits10Title'), price: '₺29.99', features: [t('feat10Dreams'), t('featStandardSpeed')], recommended: false },
      { id: 'credits_50', title: t('credits50Title'), price: '₺99', features: [t('feat50Dreams'), t('featStandardSpeed')], recommended: true },
    ];
  };

  // Gamification: artist counts, favorite, score, level
  const artistCounts = dreams.reduce<Record<string, number>>((acc, d) => {
    const name = d.artistName || '?';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const favoriteArtistName = Object.keys(artistCounts).length
    ? (Object.entries(artistCounts) as [string, number][]).sort((a, b) => b[1] - a[1])[0][0]
    : null;
  const favoriteCount = favoriteArtistName ? artistCounts[favoriteArtistName] : 0;
  const favoriteArtistImage = favoriteArtistName ? artists.find(a => a.name === favoriteArtistName)?.imageUrl : null;
  const dreamScore = dreams.length * 10 + (Object.keys(artistCounts).length * 5);
  const getLevel = (count: number) => {
    if (count >= 25) return t('levelLegend');
    if (count >= 10) return t('levelMaster');
    if (count >= 3) return t('levelExplorer');
    return t('levelNew');
  };

  const PaywallModal = () => (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => { setShowPaywall(false); setCheckoutError(null); }} aria-hidden />
      <div className="relative w-full max-w-md bg-gradient-to-b from-indigo-950 to-[#0B0D17] border border-gold-500/20 rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
        <button onClick={() => { setShowPaywall(false); setCheckoutError(null); }} className="absolute top-4 right-4 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-gold-400 rounded-full p-1" aria-label="Kapat"><X className="w-6 h-6" /></button>
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-gold-300 to-amber-600 rounded-full flex items-center justify-center mb-4"><Crown className="w-8 h-8 text-black" /></div>
          <h2 className="text-2xl font-serif font-bold text-white">{t('paywallCreditsTitle')}</h2>
          <p className="text-sm text-gray-400 mt-2">{t('paywallCreditsDesc')}</p>
        </div>
        {checkoutError && (
          <div className="mx-6 mb-2 px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-sm">
            {checkoutError}
          </div>
        )}
        <div className="px-6 pb-6 space-y-4">
          {getCreditPacks().map((pack) => (
            <div key={pack.id} onClick={() => handlePurchase(pack.id)} className="relative p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-between">
              {pack.recommended && <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider text-gold-400 bg-gold-500/20 px-2 py-0.5 rounded">{t('mostPopular')}</span>}
              <div>
                <h3 className="font-bold text-white">{pack.title}</h3>
                <div className="text-xs text-gray-400 mt-1 flex gap-2">{pack.features.map((f, i) => <span key={i}>• {f}</span>)}</div>
              </div>
              <span className="text-lg font-serif font-bold text-gold-300">{pack.price}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const SuccessView = () => (
    <div className="fixed inset-0 z-[100] flex flex-col md:items-center md:justify-center md:p-6 animate-fade-in">
      <div className="absolute inset-0 bg-[#0B0D17] md:bg-black/70 md:backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 w-full md:max-w-5xl md:max-h-[90vh] md:rounded-2xl md:shadow-2xl md:border md:border-white/10 flex flex-col md:flex-row bg-[#0B0D17] overflow-hidden flex-1 md:flex-initial">
        <div className="relative w-full md:w-2/3 flex-shrink-0 h-[40vh] md:h-auto md:min-h-0">
          <img src={generatedImage!} alt="Generated Dream" className="w-full h-full min-h-[240px] md:min-h-[85vh] object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent md:to-[#0B0D17]/80" />
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
              <span className="text-xs font-bold text-white">{t('savedToGallery')}</span>
            </div>
            <button onClick={() => setShowSuccessView(false)} className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/70 active:scale-95 focus:outline-none focus:ring-2 focus:ring-gold-400 touch-manipulation" aria-label={language === 'tr' ? 'Kapat' : 'Close'}><X className="w-5 h-5" /></button>
          </div>
          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <span className="text-xs font-bold text-gold-300 uppercase">{selectedArtist?.name} {t('style')}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 min-h-0 flex flex-col p-6 pb-28 md:pb-6 overflow-y-auto bg-[#0B0D17]/95 md:bg-[#1a1c2e]">
          <h2 className="font-serif text-xl text-gold-300 mb-4 flex items-center gap-2"><Stars className="w-5 h-5 text-purple-400 flex-shrink-0" />{t('dreamMeaningTitle')}</h2>
          <p className="text-gray-300 leading-relaxed text-sm mb-4 flex-1">{interpretation}</p>
          {dreamText.trim() && <div className="pt-4 border-t border-white/10 mb-4"><h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">{t('dreamNote')}</h4><p className="text-sm text-gray-400 italic">"{dreamText.trim()}"</p></div>}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <button onClick={() => generatedImage && handleShare(generatedImage, selectedArtist?.name ? `${t('style')} ${selectedArtist.name}` : undefined)} className="flex-1 py-3 rounded-xl border border-white/20 text-white hover:bg-white/10 flex items-center justify-center gap-2 min-h-[48px] touch-manipulation"><Share2 className="w-4 h-4" />{t('share')}</button>
              <button onClick={() => generatedImage && handleDownload(generatedImage)} className="flex-1 py-3 rounded-xl border border-white/20 text-white hover:bg-white/10 flex items-center justify-center gap-2 min-h-[48px] touch-manipulation"><Download className="w-4 h-4" />{t('download')}</button>
            </div>
            <button onClick={() => { setShowSuccessView(false); setDreamText(''); }} className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 font-bold text-white flex items-center justify-center gap-2 min-h-[52px] touch-manipulation active:scale-[0.98]">
              <Sparkles className="w-5 h-5" />{t('newDreamButton')}
            </button>
            <button onClick={() => { setShowSuccessView(false); setActiveTab('gallery'); }} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 flex items-center justify-center gap-2 min-h-[48px] touch-manipulation"><LayoutGrid className="w-4 h-4" />{t('goToGallery')}</button>
          </div>
        </div>
      </div>
    </div>
  );

  const homeContent = (
    <>
      <header className="pt-8 pb-6 px-6 flex items-center justify-between md:hidden">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg"><Moon className="w-6 h-6 text-white fill-current" /></div>
          <div>
            <h1 className="text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-100 via-white to-purple-200">{t('appName')}</h1>
          </div>
        </div>
        <button onClick={() => { setPaywallView('credits'); setShowPaywall(true); }} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full border border-white/5 min-h-[44px] touch-manipulation">
          <Zap className={`w-3.5 h-3.5 ${tier === 'PRO' ? 'text-gold-400 fill-gold-400' : 'text-gray-400'}`} />
          <span className="text-xs font-bold font-mono text-gray-200">{tier === 'PRO' ? t('generateButtonPro') : credits}</span>
        </button>
      </header>
      <main className="flex-1 px-4 sm:px-6 flex flex-col gap-8 pb-24 md:pb-6 overflow-y-auto overflow-x-hidden max-w-3xl mx-auto w-full pt-4 sm:pt-6 md:pt-12">
        <section className="space-y-3">
          <label className="text-sm font-medium text-purple-200/70 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-3 h-3" />{t('dreamInputLabel')}</label>
          <DreamTextarea value={dreamText} onChange={setDreamText} placeholder={t('dreamInputPlaceholder')} maxLength={2000} />
        </section>
        <section className="space-y-3">
          <label className="text-sm font-medium text-purple-200/70 uppercase tracking-widest">{t('artistSelectLabel')}</label>
          <div className="flex overflow-x-auto gap-4 py-4 no-scrollbar snap-x -mx-6 px-6">
            {artistsLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-24 flex flex-col items-center gap-3 animate-pulse">
                  <div className="w-20 h-20 rounded-full bg-white/10" />
                  <div className="h-3 w-12 rounded bg-white/10" />
                </div>
              ))
            ) : (
              artists.map((artist) => {
                const isSelected = selectedArtist?.id === artist.id;
                return (
                  <button key={artist.id} onClick={() => setSelectedArtist(artist)} className={`relative flex-shrink-0 w-24 flex flex-col items-center gap-3 snap-center transition-transform duration-300 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:ring-offset-2 focus:ring-offset-[#0B0D17] rounded-2xl ${isSelected ? 'scale-110 opacity-100' : 'opacity-60 scale-95 hover:opacity-80 hover:scale-100'}`}>
                    <div className={`w-20 h-20 rounded-full p-1 transition-all duration-300 ${isSelected ? 'bg-gradient-to-br from-gold-300 to-amber-600 shadow-[0_0_20px_rgba(250,204,21,0.35)]' : 'border border-white/20'}`}>
                      <img src={artist.imageUrl} alt={artist.name} className="w-full h-full rounded-full object-cover" loading="lazy" />
                    </div>
                    <span className={`text-xs font-bold text-center transition-colors ${isSelected ? 'text-gold-300' : 'text-gray-400'}`}>{artist.name.split(' ')[1] || artist.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </section>
        {generateError && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 animate-fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm flex-1">{generateError}</p>
            <button onClick={() => { setGenerateError(null); setLoadingState(LoadingState.IDLE); handleGenerate(); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-400">
              <RefreshCw className="w-4 h-4" /> {language === 'tr' ? 'Tekrar dene' : 'Retry'}
            </button>
          </div>
        )}
        <section>
          <button onClick={handleGenerate} disabled={loadingState !== LoadingState.IDLE && loadingState !== LoadingState.COMPLETE && loadingState !== LoadingState.ERROR} className={`w-full py-4 sm:py-5 rounded-xl font-serif font-bold text-base sm:text-lg tracking-wide transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-[#0B0D17] min-h-[48px] touch-manipulation ${(loadingState === LoadingState.GENERATING_IMAGE || loadingState === LoadingState.INTERPRETING) ? 'bg-gray-800 cursor-not-allowed text-gray-400' : 'bg-gradient-to-r from-amber-200 via-gold-400 to-amber-600 text-slate-900 hover:shadow-[0_0_30px_rgba(250,204,21,0.4)] hover:scale-[1.01] active:scale-[0.99]'}`}>
            <div className="flex items-center justify-center gap-2">
              {(loadingState === LoadingState.IDLE || loadingState === LoadingState.COMPLETE || loadingState === LoadingState.ERROR) ? (
                tier === 'FREE' && credits <= 0 ? <span>{t('creditLoadOrUpgrade')}</span> : <><Stars className="w-5 h-5" /><span>{t('generateButton')} ({tier === 'PRO' ? t('generateButtonPro') : t('generateButtonFree')})</span></>
              ) : (
                <><span className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900" /><span>{loadingState === LoadingState.GENERATING_IMAGE ? t('loadingImage') : t('loadingInterpret')}</span></>
              )}
            </div>
          </button>
        </section>
        <section className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
          <p className="text-xs text-gray-400 italic">{t('tip')}</p>
        </section>
        {tier === 'FREE' && (
          <section className="md:hidden p-4 rounded-xl bg-gradient-to-r from-gold-500/10 to-amber-500/10 border border-gold-500/20">
            <button onClick={() => { setPaywallView('credits'); setShowPaywall(true); }} className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-gold-500/20 to-amber-500/20 border border-gold-500/30 text-gold-300 hover:from-gold-500/30 hover:to-amber-500/30 transition-colors flex items-center justify-center gap-2 min-h-[48px] touch-manipulation">
              <Zap className="w-4 h-4" />
              {t('loadCredits')}
            </button>
          </section>
        )}
      </main>
    </>
  );

  const galleryContent = (
    <>
      <header className="pt-8 pb-6 px-6 flex items-center justify-between">
        <h1 className="text-3xl font-serif font-bold text-white">{t('galleryTitle')}</h1>
        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400">{dreams.length} {t('works')}</div>
      </header>
      <main className="flex-1 px-4 pb-24 overflow-y-auto">
        {dreams.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-gray-500 py-20">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4"><LayoutGrid className="w-8 h-8 opacity-30" /></div>
            <p className="text-center whitespace-pre-wrap">{t('galleryEmpty')}</p>
            <button onClick={() => setActiveTab('home')} className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm font-bold text-white">{t('createNow')}</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {dreams.map((dream) => (
              <div key={dream.id} onClick={() => setSelectedDreamStart(dream)} className="relative aspect-[4/5] rounded-xl overflow-hidden bg-white/5 border border-white/10 group cursor-pointer transition-transform duration-300 hover:border-gold-500/30">
                <img src={dream.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-xs text-gold-300 font-bold truncate">{dream.artistName}</p>
                  <p className="text-[10px] text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(dream.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );

  const profileContent = (
    <>
      <header className="pt-8 pb-6 px-6 flex items-center justify-between">
        <h1 className="text-3xl font-serif font-bold text-white">{t('profileTitle')}</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => refreshProfile()} className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white" title={language === 'tr' ? 'Profil verisini yenile' : 'Refresh profile'}><RefreshCw className="w-5 h-5" /></button>
          <button onClick={signOut} className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white" title="Çıkış"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>
      <main className="flex-1 px-6 flex flex-col gap-6 pb-24 overflow-y-auto max-w-3xl mx-auto w-full pt-6">
        {/* User card + plan */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 to-blue-600 flex items-center justify-center text-xl font-bold text-white overflow-hidden uppercase">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : (profile?.full_name?.[0] || user?.email?.[0] || '?')}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{profile?.username || profile?.full_name || t('userTitle')}</h2>
            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold mt-1 ${tier === 'PRO' ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30' : 'bg-gray-700 text-gray-300'}`}>
              {tier === 'PRO' && <Crown className="w-3 h-3 fill-current" />}{tier === 'PRO' ? t('proPlan') : t('freePlan')}
            </div>
            <div className="mt-3 space-y-1 text-xs text-gray-400">
              <p className="flex flex-wrap items-center gap-1.5"><span className="text-gray-500 uppercase tracking-wider">{t('profileEmail')}:</span><span className="text-gray-300 truncate">{user?.email ?? profile?.email ?? '—'}</span></p>
              <p className="flex flex-wrap items-center gap-1.5"><span className="text-gray-500 uppercase tracking-wider">{t('profileUsername')}:</span><span className="text-gray-300 font-mono">{profile?.username ?? '—'}</span></p>
              <p className="flex flex-wrap items-center gap-1.5"><span className="text-gray-500 uppercase tracking-wider">{t('profileUserId')}:</span><span className="text-gray-300 font-mono truncate">{profile?.id ?? user?.id ?? '—'}</span></p>
            </div>
          </div>
        </div>

        {/* Stats: credits + total dreams */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider"><Zap className="w-3 h-3" />{t('creditsRemaining')}</div>
            <div className="text-2xl font-serif font-bold text-white">{tier === 'PRO' ? '∞' : credits}</div>
            {tier === 'FREE' && <button onClick={() => { setPaywallView('credits'); setShowPaywall(true); }} className="text-xs text-gold-400 hover:text-gold-300 font-bold mt-1 text-left min-h-[44px] touch-manipulation flex items-center">{t('loadCredits')}</button>}
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider"><History className="w-3 h-3" />{t('dreamsGenerated')}</div>
            <div className="text-2xl font-serif font-bold text-white">{dreams.length}</div>
            <span className="text-xs text-gray-500 mt-1">{t('totalDreams')}</span>
          </div>
        </div>

        {/* Gamification: Rüya Skoru + Seviye */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-200/80 text-xs uppercase tracking-wider"><Award className="w-3 h-3" />{t('dreamScore')}</div>
            <div className="text-2xl font-serif font-bold text-amber-200 mt-0.5">{dreamScore}</div>
            <span className="text-xs text-amber-200/60 mt-1">{t('dreamScoreHint')}</span>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-indigo-600/10 border border-purple-500/20">
            <div className="flex items-center gap-2 text-purple-200/80 text-xs uppercase tracking-wider"><Stars className="w-3 h-3" />{t('level')}</div>
            <div className="text-lg font-serif font-bold text-purple-200 mt-0.5 truncate">{getLevel(dreams.length)}</div>
            <span className="text-xs text-purple-200/60 mt-1">{dreams.length} {t('dreamsWith')}</span>
          </div>
        </div>

        {tier === 'FREE' && (
          <button onClick={() => { setPaywallView('credits'); setShowPaywall(true); }} className="w-full py-4 rounded-xl font-bold text-base bg-gradient-to-r from-gold-500/20 to-amber-500/20 border border-gold-500/30 text-gold-300 hover:from-gold-500/30 hover:to-amber-500/30 transition-colors flex items-center justify-center gap-2 min-h-[52px] touch-manipulation">
            <Zap className="w-5 h-5" />
            {t('loadCredits')}
          </button>
        )}

        {/* Senin Ressamın */}
        {favoriteArtistName && (
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider mb-3"><Palette className="w-4 h-4 text-gold-400" />{t('yourPainter')}</div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gold-500/40 flex-shrink-0 bg-white/5">
                {favoriteArtistImage ? <img src={favoriteArtistImage} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-gold-500/30 to-amber-600/30 flex items-center justify-center text-gold-300 font-bold text-lg">{favoriteArtistName[0]}</div>}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-white text-lg truncate">{favoriteArtistName}</p>
                <p className="text-sm text-gray-400">{t('yourPainterDesc')}</p>
                <p className="text-xs text-gold-400 font-medium mt-0.5">{favoriteCount} {t('dreamsWith')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tarzlara göre dağılım */}
        {Object.keys(artistCounts).length > 0 && (
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider mb-3">{t('styleBreakdown')}</div>
            <div className="space-y-2">
              {(Object.entries(artistCounts) as [string, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => {
                  const values = Object.values(artistCounts) as number[];
                  const maxCount = Math.max(...values);
                  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div key={name} className="flex items-center gap-3">
                      <span className="text-sm text-gray-300 w-24 truncate">{name}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-gold-500/60 to-amber-500/60 transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-mono text-gray-400 w-6 text-right">{count}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Legal links (mobile: no sidebar) */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-2 mb-3 text-gray-400 text-xs uppercase tracking-wider">{t('legal')}</div>
          <div className="flex flex-wrap gap-3">
            <Link to="/terms" className="text-sm text-gray-400 hover:text-white">{LEGAL_LINK_LABELS[language].terms}</Link>
            <Link to="/privacy" className="text-sm text-gray-400 hover:text-white">{LEGAL_LINK_LABELS[language].privacy}</Link>
            <Link to="/refund-policy" className="text-sm text-gray-400 hover:text-white">{LEGAL_LINK_LABELS[language].refund_policy}</Link>
          </div>
        </div>

        {/* Language dropdown */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 relative">
          <div className="flex items-center gap-2 mb-3 text-gray-200 font-medium"><Globe className="w-5 h-5 text-purple-400" />{t('language')}</div>
          <button
            type="button"
            onClick={() => setLanguageDropdownOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-gold-400/50"
            aria-expanded={languageDropdownOpen}
            aria-haspopup="listbox"
          >
            <span className="flex items-center gap-2">
              <span className="text-xl leading-none">{currentLangOption.flag}</span>
              <span className="font-medium text-white">{currentLangOption.label}</span>
            </span>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${languageDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {languageDropdownOpen && (
            <>
              <div className="absolute inset-0 z-0" aria-hidden onClick={() => setLanguageDropdownOpen(false)} />
              <ul className="absolute left-4 right-4 mt-1 py-1 rounded-xl bg-[#1a1c2e] border border-white/10 shadow-xl z-10" role="listbox">
                {LANGUAGE_OPTIONS.map((opt) => (
                  <li key={opt.code} role="option" aria-selected={language === opt.code}>
                    <button
                      type="button"
                      onClick={() => { updateLanguage(opt.code); setLanguageDropdownOpen(false); }}
                      className={`w-full flex items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${language === opt.code ? 'bg-gold-500/20 text-gold-300' : 'text-gray-300 hover:bg-white/10'}`}
                    >
                      <span className="text-lg leading-none">{opt.flag}</span>
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </main>
    </>
  );

  const DreamDetailModal = ({ dream, onClose }: { dream: DreamRecord; onClose: () => void }) => {
    const fileName = `dreemart-${dream.artistName?.replace(/\s+/g, '-') || 'dream'}.png`;
    const scrollRef = useRef<HTMLDivElement>(null);
    const [swipePage, setSwipePage] = useState(0);
    const handleScroll = () => {
      const el = scrollRef.current;
      if (!el) return;
      const page = Math.round(el.scrollLeft / el.clientWidth);
      setSwipePage(page);
    };
    const goToPage = (page: number) => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ left: page * el.clientWidth, behavior: 'smooth' });
    };
    return (
    <div className="fixed inset-0 z-[70] flex sm:items-center sm:justify-center sm:p-6 animate-fade-in">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full sm:max-w-5xl sm:max-h-[85vh] h-full sm:h-auto bg-[#0B0D17] sm:rounded-2xl shadow-2xl animate-slide-up flex flex-col overflow-hidden">
        <button onClick={onClose} className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-gold-400 touch-manipulation" aria-label="Kapat"><X className="w-5 h-5" /></button>

        {/* Desktop: side-by-side */}
        <div className="hidden sm:flex flex-1 min-h-0">
          <div className="relative w-2/3 flex-shrink-0 bg-black">
            <img src={dream.imageUrl} alt="" className="w-full h-full min-h-[85vh] object-cover object-center" />
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <p className="text-xs font-bold text-gold-300 uppercase">{dream.artistName} {t('style')}</p>
            </div>
          </div>
          <div className="flex-1 p-6 overflow-y-auto flex flex-col min-w-0 bg-[#1a1c2e]">
            <h3 className="font-serif text-xl text-gold-300 mb-4 flex items-center gap-2"><Stars className="w-5 h-5 text-purple-400 flex-shrink-0" />{t('dreamMeaningTitle')}</h3>
            <p className="text-gray-300 leading-relaxed text-sm mb-4">{dream.interpretation}</p>
            {dream.prompt && <div className="pt-4 border-t border-white/10 mb-4"><h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">{t('dreamNote')}</h4><p className="text-sm text-gray-400 italic">"{dream.prompt}"</p></div>}
            <div className="mt-auto flex gap-3">
              <button onClick={() => dream.imageUrl && handleShare(dream.imageUrl, dream.artistName ? `${t('style')} ${dream.artistName}` : undefined)} className="flex-1 py-3 rounded-xl border border-white/20 text-white hover:bg-white/10 flex items-center justify-center gap-2 min-h-[48px] touch-manipulation"><Share2 className="w-4 h-4" />{t('share')}</button>
              <button onClick={() => dream.imageUrl && handleDownload(dream.imageUrl, fileName)} className="flex-1 py-3 rounded-xl border border-white/20 text-white hover:bg-white/10 flex items-center justify-center gap-2 min-h-[48px] touch-manipulation"><Download className="w-4 h-4" />{t('download')}</button>
            </div>
          </div>
        </div>

        {/* Mobile: swipeable 2 pages */}
        <div ref={scrollRef} onScroll={handleScroll} className="sm:hidden flex-1 min-h-0 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth flex" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="relative flex-[0_0_100%] w-full snap-center snap-always min-h-full">
            <img src={dream.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute bottom-20 left-4 right-4">
              <p className="text-xs font-bold text-gold-300 uppercase">{dream.artistName} {t('style')}</p>
              <p className="text-sm text-gray-400 mt-1 flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(dream.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-gray-400 text-xs animate-pulse">
              <ChevronRight className="w-4 h-4" />
              <span>{t('swipeForInterpretation')}</span>
            </div>
          </div>
          <div className="relative flex-[0_0_100%] w-full snap-center snap-always min-h-full flex flex-col">
            <div className="absolute inset-0">
              <img src={dream.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover object-center scale-105" />
              <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" />
            </div>
            <div className="relative z-10 flex-1 min-h-0 overflow-y-auto p-6 pb-28 flex flex-col">
              <h3 className="font-serif text-lg text-gold-300 mb-3 flex items-center gap-2"><Stars className="w-5 h-5 text-purple-400 flex-shrink-0" />{t('dreamMeaningTitle')}</h3>
              <p className="text-gray-200 leading-relaxed text-sm mb-4">{dream.interpretation}</p>
              {dream.prompt && <div className="pt-4 border-t border-white/10 mb-4"><h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">{t('dreamNote')}</h4><p className="text-sm text-gray-400 italic">"{dream.prompt}"</p></div>}
              <div className="mt-auto flex gap-3 pt-4">
                <button onClick={() => dream.imageUrl && handleShare(dream.imageUrl, dream.artistName ? `${t('style')} ${dream.artistName}` : undefined)} className="flex-1 py-3 rounded-xl border border-white/20 text-white hover:bg-white/10 flex items-center justify-center gap-2 min-h-[48px] touch-manipulation"><Share2 className="w-4 h-4" />{t('share')}</button>
                <button onClick={() => dream.imageUrl && handleDownload(dream.imageUrl, fileName)} className="flex-1 py-3 rounded-xl border border-white/20 text-white hover:bg-white/10 flex items-center justify-center gap-2 min-h-[48px] touch-manipulation"><Download className="w-4 h-4" />{t('download')}</button>
              </div>
            </div>
          </div>
        </div>

        {/* Swipe dots (mobile) */}
        <div className="sm:hidden flex justify-center gap-2 py-3">
          {[0, 1].map((i) => (
            <button key={i} onClick={() => goToPage(i)} className={`w-2 h-2 rounded-full transition-colors ${swipePage === i ? 'bg-gold-400 w-4' : 'bg-white/40'}`} aria-label={i === 0 ? (language === 'tr' ? 'Görsel' : 'Image') : (language === 'tr' ? 'Yorum' : 'Interpretation')} />
          ))}
        </div>
      </div>
    </div>
  );
  }

  const Sidebar = () => (
    <div className="hidden md:flex flex-col w-64 flex-shrink-0 border-r border-white/10 bg-[#0B0D17]/50 p-4 gap-2 h-screen sticky top-0">
      <Link to="/" className="flex items-center gap-2 px-4 py-4 mb-4 rounded-xl hover:bg-white/5 transition-colors">
        <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg"><Moon className="w-6 h-6 text-white fill-current" /></div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-100 via-white to-purple-200 truncate">Dreemart</h1>
          <span className="text-[10px] text-gray-500">Ana sayfaya dön</span>
        </div>
      </Link>
      {profile?.role === 'admin' && (
        <Link to={`/${ADMIN_PATH}`} className="flex items-center gap-3 px-4 py-3 rounded-xl text-left text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
          <Settings className="w-5 h-5" />
          <span className="text-sm font-medium">Yönetim Paneli</span>
        </Link>
      )}
      <button onClick={() => setActiveTab('home')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left ${activeTab === 'home' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:bg-white/5'}`}><Home className="w-5 h-5" />{t('tabHome')}</button>
      <button onClick={() => setActiveTab('gallery')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left ${activeTab === 'gallery' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:bg-white/5'}`}><LayoutGrid className="w-5 h-5" />{t('tabGallery')}</button>
      <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left ${activeTab === 'profile' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:bg-white/5'}`}><User className="w-5 h-5" />{t('tabProfile')}</button>
      <div className="mt-auto pt-4 border-t border-white/5 space-y-1">
        <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-gray-500">{t('legal')}</div>
        <Link to="/terms" className="block px-4 py-1.5 text-xs text-gray-400 hover:text-white transition-colors">{LEGAL_LINK_LABELS[language].terms}</Link>
        <Link to="/privacy" className="block px-4 py-1.5 text-xs text-gray-400 hover:text-white transition-colors">{LEGAL_LINK_LABELS[language].privacy}</Link>
        <Link to="/cookie-policy" className="block px-4 py-1.5 text-xs text-gray-400 hover:text-white transition-colors">{LEGAL_LINK_LABELS[language].cookie_policy}</Link>
        <Link to="/refund-policy" className="block px-4 py-1.5 text-xs text-gray-400 hover:text-white transition-colors">{LEGAL_LINK_LABELS[language].refund_policy}</Link>
        <button onClick={() => { setPaywallView('credits'); setShowPaywall(true); }} className="w-full mt-3 flex items-center justify-between bg-gradient-to-r from-purple-900/40 to-blue-900/40 px-4 py-3 rounded-xl border border-white/5">
          <div className="flex items-center gap-2"><Zap className={`w-4 h-4 ${tier === 'PRO' ? 'text-gold-400' : 'text-gray-400'}`} /><span className="text-sm font-bold text-gray-200">{tier === 'PRO' ? t('proPlan') : `${credits} Credits`}</span></div>
          {tier !== 'PRO' && <span className="text-xs text-gold-400 font-bold">{t('loadCredits')}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-[#0B0D17] to-black text-gray-100 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-900/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-blue-900/20 rounded-full blur-[100px]" />
      </div>
      <div className="relative z-10 w-full max-w-7xl mx-auto min-h-screen flex flex-col md:flex-row">
        {!showSuccessView && <Sidebar />}
        <div className="flex-1 flex flex-col min-w-0">
          {showSuccessView && <SuccessView />}
          {activeTab === 'home' && !showSuccessView && homeContent}
          {activeTab === 'gallery' && !showSuccessView && galleryContent}
          {activeTab === 'profile' && !showSuccessView && profileContent}
        </div>
        {!showSuccessView && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 w-full bg-[#0B0D17]/90 backdrop-blur-lg border-t border-white/10 pb-safe">
            <div className="flex justify-around items-center h-14 min-h-[56px]">
              <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-0.5 w-full h-full justify-center min-h-[44px] touch-manipulation ${activeTab === 'home' ? 'text-gold-400' : 'text-gray-500'}`}><Home className="w-6 h-6" /><span className="text-[10px] font-bold">{t('tabHome')}</span></button>
              <button onClick={() => setActiveTab('gallery')} className={`flex flex-col items-center gap-0.5 w-full h-full justify-center min-h-[44px] touch-manipulation ${activeTab === 'gallery' ? 'text-gold-400' : 'text-gray-500'}`}><LayoutGrid className="w-6 h-6" /><span className="text-[10px] font-bold">{t('tabGallery')}</span></button>
              <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-0.5 w-full h-full justify-center min-h-[44px] touch-manipulation ${activeTab === 'profile' ? 'text-gold-400' : 'text-gray-500'}`}><User className="w-6 h-6" /><span className="text-[10px] font-bold">{t('tabProfile')}</span></button>
            </div>
          </div>
        )}
        {selectedDreamStart && <DreamDetailModal dream={selectedDreamStart} onClose={() => setSelectedDreamStart(null)} />}
        {showPaywall && <PaywallModal />}
        {(loadingState === LoadingState.GENERATING_IMAGE || loadingState === LoadingState.INTERPRETING) && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#1a1c2e] border border-white/10 shadow-2xl p-8 flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-full border-2 border-gold-500/50 border-t-gold-400 flex items-center justify-center">
                <span className="animate-spin rounded-full h-10 w-10 border-2 border-transparent border-t-gold-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">
                  {loadingState === LoadingState.GENERATING_IMAGE ? t('loadingImage') : t('loadingInterpret')}
                </p>
                <p className="text-sm text-gray-400 mt-1">{t('loadingSubtitle')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
