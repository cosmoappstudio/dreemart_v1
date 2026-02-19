import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Moon, Loader2, ChevronDown } from 'lucide-react';
import { LEGAL_LINK_LABELS } from './landingTranslations';
import type { Language } from './types';

const PATH_TO_KEY: Record<string, string> = {
  '/terms': 'terms',
  '/privacy': 'privacy',
  '/refund-policy': 'refund_policy',
  '/cookie-policy': 'cookie_policy',
};

const LANG_OPTIONS: { code: Language; flag: string; label: string }[] = [
  { code: 'tr', flag: '🇹🇷', label: 'Türkçe' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
];

export default function LegalPage() {
  const { pathname } = useLocation();
  const key = PATH_TO_KEY[pathname] || 'terms';
  const [lang, setLang] = useState<Language>('tr');
  const [langOpen, setLangOpen] = useState(false);
  const [data, setData] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setData({ title: LEGAL_LINK_LABELS.tr[key as keyof typeof LEGAL_LINK_LABELS.tr] || key, content: '<p>İçerik yüklenemedi. Backend bağlı değil.</p>' });
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('legal_pages')
      .select('title, content')
      .eq('key', key)
      .eq('language', lang)
      .single()
      .then(({ data: row, error }) => {
        if (row) setData({ title: row.title, content: row.content });
        else if (error) setData({ title: LEGAL_LINK_LABELS[lang][key as keyof (typeof LEGAL_LINK_LABELS.tr)] || key, content: '<p>İçerik henüz eklenmemiş.</p>' });
        setLoading(false);
      });
  }, [key, lang]);

  const t = LEGAL_LINK_LABELS[lang];
  const backUrl = '/app';

  return (
    <div className="min-h-screen bg-[#0B0D17] text-gray-100 overflow-x-hidden">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 px-3 sm:px-4 py-3 sm:py-4 bg-[#0B0D17]/90 backdrop-blur border-b border-white/10">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <Moon className="w-6 h-6 text-white fill-current flex-shrink-0" />
            <span className="font-serif font-bold text-white truncate">DreamInk</span>
          </Link>
          <Link to={backUrl} className="text-xs sm:text-sm text-gray-400 hover:text-white whitespace-nowrap flex-shrink-0">
            {t.backToApp}
          </Link>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setLangOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm min-h-[44px] touch-manipulation"
            aria-label="Dil seçimi"
          >
            <span>{LANG_OPTIONS.find((o) => o.code === lang)?.flag}</span>
            <ChevronDown className={`w-4 h-4 ${langOpen ? 'rotate-180' : ''}`} />
          </button>
          {langOpen && (
            <>
              <div className="fixed inset-0 z-0" aria-hidden onClick={() => setLangOpen(false)} />
              <ul className="absolute right-0 mt-1 py-1 rounded-xl bg-[#1a1c2e] border border-white/10 shadow-xl z-30 min-w-[140px]">
                {LANG_OPTIONS.map((opt) => (
                  <li key={opt.code}>
                    <button
                      type="button"
                      onClick={() => { setLang(opt.code); setLangOpen(false); }}
                      className={`w-full flex items-center gap-2 py-2 px-4 text-sm ${lang === opt.code ? 'text-gold-400 bg-gold-500/10' : 'text-gray-300 hover:bg-white/10'}`}
                    >
                      {opt.flag} {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
            <p className="text-gray-400 text-sm">Yükleniyor...</p>
          </div>
        ) : data ? (
          <>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-white mb-6 sm:mb-8 break-words">{data.title}</h1>
            <div
              className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed [&_h2]:text-base sm:[&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_p]:mb-4 [&_p]:text-sm sm:[&_p]:text-base [&_a]:text-gold-400 [&_a]:underline break-words overflow-x-hidden"
              dangerouslySetInnerHTML={{ __html: data.content }}
            />
          </>
        ) : null}
      </main>

      <footer className="border-t border-white/10 py-4 mt-8 sm:mt-12 pb-safe">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
          <Link to="/" className="hover:text-white touch-manipulation">DreamInk</Link>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <Link to="/terms" className="hover:text-white touch-manipulation">Terms</Link>
            <Link to="/privacy" className="hover:text-white touch-manipulation">Privacy</Link>
            <Link to="/refund-policy" className="hover:text-white touch-manipulation">Refund</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
