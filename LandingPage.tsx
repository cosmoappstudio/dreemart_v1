import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Moon, Palette, MessageSquare, Award, ChevronDown, Sparkles,
  Zap, LayoutGrid, Lock, Gem, Gift, Home, BookOpen, Heart
} from 'lucide-react';
import { LANDING } from './landingTranslations';
import type { Language } from './types';
import { supabase } from './lib/supabase';
import { useAuth } from './context/AuthContext';
import { trackEvent } from './lib/analytics';

const LANG_OPTIONS: { code: Language; flag: string; label: string }[] = [
  { code: 'tr', flag: '🇹🇷', label: 'Türkçe' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
];

export interface LandingExample {
  id: string;
  dream_text: string;
  artist_name: string;
  image_url: string;
  sort_order: number;
}

export interface PricingPack {
  id: string;
  name: string;
  price: string;
  per: string;
  credits_text: string;
  credits_amount?: number;
  artist_styles_count?: number;
  paddle_product_id?: string | null;
  lemon_squeezy_variant_id?: string | null;
  lemon_squeezy_checkout_uuid?: string | null;
  four_k: boolean;
  badge: string | null;
  sort_order: number;
}

const FALLBACK_EXAMPLES: LandingExample[] = [
  { id: '1', dream_text: 'Denizin üstünde yürüyordum, ay ışığı suya vuruyordu...', artist_name: 'Van Gogh', image_url: 'https://picsum.photos/seed/dreemart1/600/400', sort_order: 0 },
  { id: '2', dream_text: 'Uçan bir atın sırtında bulutların arasından geçiyordum.', artist_name: 'Salvador Dalí', image_url: 'https://picsum.photos/seed/dreemart2/600/400', sort_order: 1 },
];

const FALLBACK_PACKS: PricingPack[] = [
  { id: '1', name: 'DENEME', price: '₺59', per: '/ 5 Kredi', credits_text: '5 Kredi', four_k: false, badge: null, sort_order: 0 },
  { id: '2', name: 'BAŞLANGIÇ', price: '₺99', per: '/ 15 Kredi', credits_text: '15 Kredi', four_k: false, badge: null, sort_order: 1 },
  { id: '3', name: 'POPÜLER', price: '₺149', per: '/ 30 Kredi', credits_text: '30 Kredi', four_k: true, badge: 'Popüler', sort_order: 2 },
  { id: '4', name: 'PRO', price: '₺299', per: '/ 100 Kredi', credits_text: '100 Kredi', four_k: true, badge: null, sort_order: 3 },
];

export default function LandingPage() {
  const { user } = useAuth();
  const [lang, setLang] = useState<Language>('tr');
  const [langOpen, setLangOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [demoDream, setDemoDream] = useState('');
  const [demoArtist, setDemoArtist] = useState<'vg' | 'dali' | 'monet'>('vg');
  const [examples, setExamples] = useState<LandingExample[]>(FALLBACK_EXAMPLES);
  const [packs, setPacks] = useState<PricingPack[]>(FALLBACK_PACKS);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const howSectionRef = useRef<HTMLElement>(null);
  const t = LANDING[lang];

  useEffect(() => {
    if (!supabase) return;
    supabase.from('landing_examples').select('id, dream_text, artist_name, image_url, sort_order').order('sort_order').then(({ data }) => {
      if (data && data.length >= 2) setExamples(data as LandingExample[]);
    });
    supabase.from('pricing_packs').select('id, name, price, per, credits_text, credits_amount, artist_styles_count, four_k, badge, sort_order').order('sort_order').then(({ data }) => {
      if (data && data.length) setPacks(data as PricingPack[]);
    });
    supabase.from('site_settings').select('key, value').in('key', ['logo_url', 'social_instagram', 'social_tiktok', 'social_facebook', 'social_twitter', 'social_youtube']).then(({ data }) => {
      const rows = (data ?? []) as { key: string; value: string }[];
      rows.forEach((r) => {
        if (r.key === 'logo_url' && r.value?.trim()) setLogoUrl(r.value.trim());
        else if (r.key.startsWith('social_') && r.value?.trim()) setSocialLinks((s) => ({ ...s, [r.key]: r.value.trim() }));
      });
    });
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTestimonialIndex((i) => (i + 1) % 3), 5000);
    return () => clearInterval(id);
  }, []);

  const scrollToHow = () => {
    trackEvent('cta_click', { placement: 'how', label: 'scroll_to_how' });
    howSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDemoCreate = () => {
    trackEvent('demo_create_click', { artist: demoArtist });
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-[#0B0D17] to-black text-gray-100 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-900/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-amber-900/15 rounded-full blur-[80px]" />
      </div>

      {/* ========== HEADER ========== */}
      <header className="relative z-20 flex items-center justify-between gap-2 px-4 sm:px-6 py-4 sm:py-5 max-w-6xl mx-auto pt-safe mt-2 sm:mt-4">
        <Link to="/" className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt="Dreemart" className="h-9 w-auto sm:h-10 object-contain flex-shrink-0" />
          ) : (
            <>
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg sm:rounded-xl flex-shrink-0">
                <Moon className="w-6 h-6 sm:w-7 sm:h-7 text-white fill-current" />
              </div>
              <span className="text-lg sm:text-xl font-serif font-bold text-white truncate">Dreemart</span>
            </>
          )}
        </Link>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm min-h-[44px] touch-manipulation"
              aria-label={LANG_OPTIONS.find((o) => o.code === lang)?.label}
            >
              <span className="text-base sm:text-sm">{LANG_OPTIONS.find((o) => o.code === lang)?.flag}</span>
              <span className="text-gray-200 hidden sm:inline text-xs sm:text-sm max-w-[70px] truncate">{LANG_OPTIONS.find((o) => o.code === lang)?.label}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${langOpen ? 'rotate-180' : ''}`} />
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-0" aria-hidden onClick={() => setLangOpen(false)} />
                <ul className="absolute right-0 mt-1 py-1 rounded-xl bg-[#1a1c2e] border border-white/10 shadow-xl z-30 min-w-[140px]">
                  {LANG_OPTIONS.map((opt) => (
                    <li key={opt.code}>
                      <button
                        type="button"
                        onClick={() => { trackEvent('language_change', { from: lang, to: opt.code }); setLang(opt.code); setLangOpen(false); }}
                        className={`w-full flex items-center gap-2 py-2.5 px-4 text-sm font-medium ${lang === opt.code ? 'text-amber-400 bg-amber-500/10' : 'text-gray-300 hover:bg-white/10'}`}
                      >
                        {opt.flag} {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {user ? (
            <button onClick={() => { trackEvent('cta_click', { placement: 'header', label: 'to_app' }); navigate('/app'); }} className="px-3 sm:px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-200 font-medium text-xs sm:text-sm hover:bg-amber-500/30 min-h-[44px] touch-manipulation whitespace-nowrap">
              Uygulamaya Git
            </button>
          ) : (
            <button onClick={() => { trackEvent('cta_click', { placement: 'header', label: 'login' }); navigate('/login'); }} className="px-3 sm:px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-medium text-xs sm:text-sm hover:bg-white/15 min-h-[44px] touch-manipulation whitespace-nowrap">
              {t.ctaLogin}
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-3 sm:px-4 pb-24 overflow-x-hidden">
        {/* ========== SECTION 1: HERO ========== */}
        <section className="pt-2 sm:pt-4 pb-10 sm:pb-16">
          <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-100 via-white to-amber-100 mb-3 sm:mb-4 leading-tight px-1">
              {t.heroTitle}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-6 sm:mb-8 px-1">{t.heroSubtitle}</p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
              <button onClick={() => { trackEvent('cta_click', { placement: 'hero', label: 'free_try' }); navigate('/login'); }} className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-base sm:text-lg hover:from-purple-600 hover:to-indigo-700 shadow-lg transition-all min-h-[48px] touch-manipulation">
                {t.ctaFree}
              </button>
              <button type="button" onClick={scrollToHow} className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-white/10 border border-white/20 text-gray-200 font-bold text-base sm:text-lg hover:bg-white/15 transition-all min-h-[48px] touch-manipulation">
                {t.ctaHow}
              </button>
            </div>
          </div>
          {/* Example dreams: 2 rows (dream + artist + output), admin-editable */}
          <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 mb-6 sm:mb-8">
            {examples.slice(0, 2).map((ex) => (
              <div key={ex.id} className="rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 bg-white/5 flex flex-col sm:flex-row gap-0 sm:gap-4">
                <div className="flex-1 p-4 sm:p-6 flex flex-col justify-center min-w-0">
                  <p className="text-xs font-bold text-amber-400/90 uppercase tracking-wider mb-2">{t.demoPlaceholder}</p>
                  <p className="text-gray-200 text-sm sm:text-base leading-relaxed line-clamp-3 sm:line-clamp-none">{ex.dream_text || '—'}</p>
                  <p className="mt-3 text-xs sm:text-sm text-gray-500 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-amber-400/80" />
                    <span className="font-medium text-amber-300/90">{ex.artist_name}</span>
                    <span className="text-gray-500">{t.styleTag}</span>
                  </p>
                </div>
                <div className="flex-shrink-0 w-full sm:w-56 md:w-64 aspect-[4/3] sm:aspect-square relative bg-black/30">
                  <img src={ex.image_url || 'https://picsum.photos/seed/placeholder/400/300'} alt="" className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/60 text-amber-300 text-xs font-medium">
                    {ex.artist_name} {t.styleTag}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Social proof bar */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 md:gap-12 text-center text-xs sm:text-sm text-gray-400">
            <span>{t.socialProof1}</span>
            <span className="text-amber-400">★ {t.socialProof2}</span>
            <span>{t.socialProof3}</span>
          </div>
        </section>

        {/* ========== SECTION 2: PROBLEM → SOLUTION ========== */}
        <section className="py-10 sm:py-16 border-t border-white/5">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-white text-center mb-2 sm:mb-3 px-2">{t.problemTitle}</h2>
          <p className="text-gray-400 text-center mb-8 sm:mb-12 max-w-2xl mx-auto text-sm sm:text-base px-2">{t.problemDesc}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-red-500/10 border border-red-500/20">
              <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 sm:mb-4">{t.cardBefore}</p>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• {t.cardBefore1}</li>
                <li>• {t.cardBefore2}</li>
                <li>• {t.cardBefore3}</li>
              </ul>
            </div>
            <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 sm:mb-4">{t.cardAfter}</p>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• {t.cardAfter1}</li>
                <li>• {t.cardAfter2}</li>
                <li>• {t.cardAfter3}</li>
              </ul>
            </div>
            <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 sm:mb-4">{t.cardBonus}</p>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• {t.cardBonus1}</li>
                <li>• {t.cardBonus2}</li>
                <li>• {t.cardBonus3}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ========== SECTION 3: HOW IT WORKS ========== */}
        <section id="how" ref={howSectionRef} className="py-10 sm:py-16 scroll-mt-8 border-t border-white/5">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-white text-center mb-8 sm:mb-12 px-2">{t.howTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            <div className="relative p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-center">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-purple-500/80 text-white font-bold flex items-center justify-center">1</span>
              <div className="w-16 h-16 mx-auto mt-4 mb-4 rounded-xl bg-purple-500/20 flex items-center justify-center"><MessageSquare className="w-8 h-8 text-purple-400" /></div>
              <h3 className="text-lg font-bold text-white mb-2">{t.step1Title}</h3>
              <p className="text-sm text-gray-400">{t.step1Desc}</p>
            </div>
            <div className="relative p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-center">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-amber-500/80 text-white font-bold flex items-center justify-center">2</span>
              <div className="w-16 h-16 mx-auto mt-4 mb-4 rounded-xl bg-amber-500/20 flex items-center justify-center"><Palette className="w-8 h-8 text-amber-400" /></div>
              <h3 className="text-lg font-bold text-white mb-2">{t.step2Title}</h3>
              <p className="text-sm text-gray-400">{t.step2Desc}</p>
            </div>
            <div className="relative p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-center">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-indigo-500/80 text-white font-bold flex items-center justify-center">3</span>
              <div className="w-16 h-16 mx-auto mt-4 mb-4 rounded-xl bg-indigo-500/20 flex items-center justify-center"><Award className="w-8 h-8 text-indigo-400" /></div>
              <h3 className="text-lg font-bold text-white mb-2">{t.step3Title}</h3>
              <p className="text-sm text-gray-400">{t.step3Desc}</p>
            </div>
          </div>
          <div className="text-center mt-6 sm:mt-8">
            <button onClick={() => { trackEvent('cta_click', { placement: 'how', label: 'try' }); navigate('/login'); }} className="w-full sm:w-auto px-6 sm:px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold min-h-[48px] touch-manipulation">{t.ctaTry}</button>
          </div>
        </section>

        {/* ========== SECTION 4: INTERACTIVE DEMO ========== */}
        <section className="py-10 sm:py-16 border-t border-white/5">
          <div className="relative max-w-5xl mx-auto">
            {/* Glow behind card */}
            <div className="absolute inset-0 -mx-2 sm:-mx-4 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-purple-500/15 via-amber-500/10 to-indigo-500/15 blur-2xl pointer-events-none" aria-hidden />
            <div className="relative rounded-2xl sm:rounded-3xl border-2 border-white/15 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-4 sm:p-6 md:p-8 shadow-2xl shadow-purple-500/10">
              <div className="text-center mb-6 sm:mb-8">
                <span className="inline-block px-3 sm:px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider border border-amber-500/30 mb-3 sm:mb-4">
                  ✨ {t.demoTitle}
                </span>
                <p className="text-gray-400 text-xs sm:text-sm max-w-xl mx-auto px-1">{t.demoLoginNote}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-5 sm:gap-6 md:gap-8 items-stretch">
                {/* Input column */}
                <div className="space-y-5">
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-300 block mb-2">{t.demoPlaceholder}</span>
                    <textarea
                      value={demoDream}
                      onChange={(e) => setDemoDream(e.target.value)}
                      placeholder={t.demoExample}
                      className="w-full min-h-[120px] h-28 sm:h-36 bg-black/40 border-2 border-white/15 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-3 sm:py-4 text-white placeholder-gray-500 resize-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all outline-none text-sm sm:text-base"
                    />
                  </label>
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-3">{t.demoArtistLabel}</span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'vg' as const, label: t.demoArtist1 },
                        { id: 'dali' as const, label: t.demoArtist2 },
                        { id: 'monet' as const, label: t.demoArtist3 },
                      ].map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setDemoArtist(a.id)}
                          className={`px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all min-h-[44px] touch-manipulation ${
                            demoArtist === a.id
                              ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25 border-0'
                              : 'bg-white/10 text-gray-400 border border-white/10 hover:bg-white/15 hover:text-gray-200'
                          }`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleDemoCreate}
                    className="w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 text-white font-bold text-base sm:text-lg shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[48px] touch-manipulation"
                  >
                    <Palette className="w-5 h-5" />
                    {t.demoButton}
                  </button>
                </div>

                {/* Center arrow (desktop) */}
                <div className="hidden md:flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500/30 to-amber-500/30 border-2 border-white/20 flex items-center justify-center">
                    <span className="text-xl text-white">→</span>
                  </div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-2">AI</p>
                </div>

                {/* Output column */}
                <div className="flex flex-col">
                  <div className="flex-1 rounded-2xl overflow-hidden border-2 border-white/15 bg-black/30 shadow-inner ring-2 ring-white/5">
                    <div className="aspect-[4/3] relative">
                      <img src="https://picsum.photos/seed/demoout/500/375" alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg bg-black/60 text-amber-300 text-xs font-medium backdrop-blur-sm">
                          ⏱ 19.8 {t.demoOutputReady}
                        </span>
                        <button
                          onClick={() => { trackEvent('cta_click', { placement: 'demo', label: 'download' }); navigate('/login'); }}
                          className="px-3 py-2 rounded-lg bg-white/20 text-white text-xs font-medium backdrop-blur-sm hover:bg-white/30 border border-white/20 touch-manipulation min-h-[36px]"
                        >
                          {t.demoDownload}
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-xs text-gray-500 mt-3">{t.demoOutputHint}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== SECTION 6: FEATURES ========== */}
        <section className="py-10 sm:py-16 border-t border-white/5">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-white text-center mb-6 sm:mb-10 px-2">{t.featuresTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: Palette, title: t.feat1Title, desc: t.feat1Desc },
              { icon: Zap, title: t.feat2Title, desc: t.feat2Desc },
              { icon: Sparkles, title: t.feat3Title, desc: t.feat3Desc },
              { icon: LayoutGrid, title: t.feat4Title, desc: t.feat4Desc },
              { icon: Lock, title: t.feat5Title, desc: t.feat5Desc },
              { icon: Gem, title: t.feat6Title, desc: t.feat6Desc },
            ].map((f, i) => (
              <div key={i} className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10">
                <f.icon className="w-10 h-10 text-amber-400/80 mb-3" />
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ========== SECTION 7: TESTIMONIALS ========== */}
        <section className="py-10 sm:py-16 border-t border-white/5">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-white text-center mb-6 sm:mb-10 px-2">{t.testimonialsTitle}</h2>
          <div className="max-w-2xl mx-auto relative min-h-[180px] sm:min-h-[200px]">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`absolute inset-0 p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 transition-opacity duration-500 ${i === testimonialIndex ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'}`}
              >
                <div className="flex gap-1 mb-3 text-amber-400">★★★★★</div>
                <p className="text-gray-300 mb-4">"{(t as Record<string, string>)[`test${i + 1}`]}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-white">{(t as Record<string, string>)[`test${i + 1}Author`]}</span>
                </div>
              </div>
            ))}
            <div className="flex justify-center gap-2 pt-4 relative z-20">
              {[0, 1, 2].map((i) => (
                <button key={i} type="button" onClick={() => setTestimonialIndex(i)} className={`w-2 h-2 rounded-full transition-colors ${i === testimonialIndex ? 'bg-amber-400' : 'bg-white/40'}`} />
              ))}
            </div>
          </div>
        </section>

        {/* ========== SECTION 8: USE CASES ========== */}
        <section className="py-10 sm:py-16 border-t border-white/5">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-white text-center mb-6 sm:mb-10 px-2">{t.useCasesTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: Gift, title: t.use1Title, desc: t.use1Desc },
              { icon: Home, title: t.use2Title, desc: t.use2Desc },
              { icon: BookOpen, title: t.use3Title, desc: t.use3Desc },
              { icon: Heart, title: t.use4Title, desc: t.use4Desc },
            ].map((u, i) => (
              <div key={i} className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-center">
                <u.icon className="w-12 h-12 text-amber-400/80 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-2">{u.title}</h3>
                <p className="text-sm text-gray-400">{u.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ========== SECTION 9: PRICING ========== (admin-editable packs) */}
        <section className="py-10 sm:py-16 border-t border-white/5">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-white text-center mb-2 sm:mb-3 px-2">{t.pricingTitle}</h2>
          <p className="text-gray-400 text-center mb-6 sm:mb-10 text-sm sm:text-base px-2">{t.pricingDesc}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-row items-stretch justify-center gap-3 sm:gap-4 md:gap-5 max-w-5xl mx-auto">
            {packs.map((p, i) => (
              <div
                key={p.id}
                className={`relative flex-1 flex flex-col min-w-0 rounded-xl sm:rounded-2xl p-3 sm:p-6 transition-all duration-200 hover:border-white/20 ${
                  p.badge
                    ? 'bg-gradient-to-b from-amber-500/15 to-transparent border-2 border-amber-400/50 shadow-lg shadow-amber-500/10 md:scale-105'
                    : 'bg-white/[0.06] border border-white/10 backdrop-blur-sm'
                }`}
              >
                {p.badge && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-amber-400 text-black text-[10px] sm:text-xs font-bold whitespace-nowrap">
                    {p.badge}
                  </span>
                )}
                <div className="text-center mb-3 sm:mb-5">
                  <h3 className="text-xs sm:text-base font-bold text-white uppercase tracking-wider truncate">{p.name}</h3>
                  <p className="mt-2 sm:mt-3 text-xl sm:text-3xl font-bold text-white tracking-tight">
                    {p.price}<span className="text-[10px] sm:text-sm font-normal text-gray-400">{p.per}</span>
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">{(p.credits_amount ?? 0) > 0 ? `${p.credits_amount} ${t.packConversionText}` : `${p.credits_text} ${t.packFeature1}`}</p>
                </div>
                <ul className="space-y-1.5 sm:space-y-2.5 text-xs sm:text-sm text-gray-300 flex-1">
                  <li className="flex items-center gap-2">✓ {p.artist_styles_count ?? 40} {t.packFeature2Suffix}</li>
                  <li className="flex items-center gap-2">✓ {p.four_k ? t.packFeature4 : t.packFeature3}</li>
                  <li className="flex items-center gap-2">✓ {t.packFeature5}</li>
                  <li className="flex items-center gap-2">✓ {t.packFeature6}</li>
                </ul>
                <button
                  onClick={() => { trackEvent('pricing_pack_click', { pack_id: p.id, pack_name: p.name }); navigate('/login'); }}
                  className={`mt-3 sm:mt-6 w-full py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all min-h-[44px] touch-manipulation ${
                    p.badge
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 shadow-lg'
                      : 'bg-white/10 text-gray-200 hover:bg-white/15 border border-white/10'
                  }`}
                >
                  {t.packCta}
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs sm:text-sm text-gray-500 mt-6 sm:mt-8 px-2">{t.pricingNote1} · {t.pricingNote2}</p>
        </section>

        {/* ========== SECTION 10: FAQ ========== */}
        <section className="py-10 sm:py-16 border-t border-white/5 max-w-2xl mx-auto px-1">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-white text-center mb-6 sm:mb-10 px-2">{t.faqTitle}</h2>
          <div className="space-y-2 sm:space-y-3">
            {(Array.from({ length: 10 }, (_, i) => i + 1) as const).map((i) => (
              <div key={i} className="rounded-lg sm:rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                <button type="button" onClick={() => { const next = openFaq === i ? null : i; if (next) trackEvent('faq_open', { faq_index: String(i) }); setOpenFaq(next); }} className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 sm:py-4 text-left text-white font-medium hover:bg-white/5 min-h-[48px] touch-manipulation">
                  <span className="text-xs sm:text-sm pr-2">{(t as Record<string, string>)[`faq${i}Q`]}</span>
                  <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && <div className="px-4 sm:px-5 pb-4"><p className="text-xs sm:text-sm text-gray-400">{(t as Record<string, string>)[`faq${i}A`]}</p></div>}
              </div>
            ))}
          </div>
        </section>

        {/* ========== SECTION 12: FINAL CTA ========== */}
        <section className="py-12 sm:py-20 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-blue-900/40 border border-white/10 px-3 sm:px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-xl sm:text-2xl md:text-4xl font-serif font-bold text-white mb-2 sm:mb-3 px-1">{t.finalCtaTitle}</h2>
            <p className="text-gray-300 mb-6 sm:mb-8 text-sm sm:text-base px-1">{t.finalCtaSubtitle}</p>
            <button onClick={() => { trackEvent('cta_click', { placement: 'final', label: 'start' }); navigate('/login'); }} className="w-full sm:w-auto px-8 sm:px-12 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-base sm:text-lg shadow-lg min-h-[48px] touch-manipulation">
              {t.finalCtaButton}
            </button>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mt-6 sm:mt-8 text-xs sm:text-sm text-gray-400">
              <span>{t.finalCtaNote1}</span>
              <span>{t.finalCtaNote2}</span>
              <span>{t.finalCtaNote3}</span>
            </div>
          </div>
        </section>
      </main>

      {/* ========== SECTION 13: FOOTER ========== */}
      <footer className="relative z-10 border-t border-white/10 py-8 sm:py-12 pb-safe">
        <div className="max-w-6xl mx-auto px-3 sm:px-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 sm:gap-10 mb-8 sm:mb-10">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt="Dreemart" className="h-7 w-auto sm:h-8 object-contain flex-shrink-0" />
              ) : (
                <>
                  <Moon className="w-7 h-7 sm:w-8 sm:h-8 text-white fill-current flex-shrink-0" />
                  <span className="text-lg sm:text-xl font-serif font-bold text-white">Dreemart</span>
                </>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{t.footerProduct}</p>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><a href="#how" className="hover:text-white">{t.footerHow}</a></li>
                  <li><button type="button" onClick={() => { trackEvent('cta_click', { placement: 'footer', label: 'pricing' }); navigate('/login'); }} className="hover:text-white text-left">{t.footerPricing}</button></li>
                  <li><button type="button" onClick={() => { trackEvent('cta_click', { placement: 'footer', label: 'features' }); navigate('/login'); }} className="hover:text-white text-left">{t.footerFeatures}</button></li>
                  <li><span className="text-gray-500">{t.footerMobile}</span></li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{t.footerCompany}</p>
                <ul className="space-y-2 text-sm text-gray-400"><li><span>{t.footerContact}</span></li></ul>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{t.footerLegal}</p>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><Link to="/privacy" className="hover:text-white">{t.footerPrivacyLink}</Link></li>
                  <li><Link to="/terms" className="hover:text-white">{t.footerTermsLink}</Link></li>
                  <li><Link to="/cookie-policy" className="hover:text-white">{t.footerCookies}</Link></li>
                  <li><Link to="/refund-policy" className="hover:text-white">{t.footerRefundLink}</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{t.footerSocial}</p>
                <div className="flex flex-wrap gap-3 sm:gap-4 text-gray-400 text-xs sm:text-sm">
                  {socialLinks.social_instagram && <a href={socialLinks.social_instagram} target="_blank" rel="noopener noreferrer" className="hover:text-white touch-manipulation min-h-[44px] flex items-center" aria-label="Instagram">Instagram</a>}
                  {socialLinks.social_tiktok && <a href={socialLinks.social_tiktok} target="_blank" rel="noopener noreferrer" className="hover:text-white touch-manipulation min-h-[44px] flex items-center" aria-label="TikTok">TikTok</a>}
                  {socialLinks.social_facebook && <a href={socialLinks.social_facebook} target="_blank" rel="noopener noreferrer" className="hover:text-white touch-manipulation min-h-[44px] flex items-center" aria-label="Facebook">Facebook</a>}
                  {socialLinks.social_twitter && <a href={socialLinks.social_twitter} target="_blank" rel="noopener noreferrer" className="hover:text-white touch-manipulation min-h-[44px] flex items-center" aria-label="X">X</a>}
                  {socialLinks.social_youtube && <a href={socialLinks.social_youtube} target="_blank" rel="noopener noreferrer" className="hover:text-white touch-manipulation min-h-[44px] flex items-center" aria-label="YouTube">YouTube</a>}
                </div>
              </div>
            </div>
          </div>
          <div className="pt-4 sm:pt-6 border-t border-white/5 text-center text-xs sm:text-sm text-gray-500">© Dreemart</div>
        </div>
      </footer>
    </div>
  );
}
