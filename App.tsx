import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { pageView } from './lib/analytics';
import { metaPageView } from './lib/metaPixel';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import { LANDING } from './landingTranslations';
import type { Language } from './types';
import { ChevronDown } from 'lucide-react';
import { ADMIN_PATH } from './lib/adminPath';
import MainApp from './MainApp';
import AdminApp from './admin/AdminApp';
import LandingPage from './LandingPage';
import LegalPage from './LegalPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D17] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function LandingOrApp() {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D17] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500" />
      </div>
    );
  }
  return <LandingPage />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D17] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500" />
      </div>
    );
  }
  if (!user) return <Navigate to={`/${ADMIN_PATH}/login`} replace />;
  const isAdmin = profile?.role === 'admin';
  if (!isAdmin) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

/** Google Analytics page view tracking on route change. */
function AnalyticsPageView() {
  const location = useLocation();
  useEffect(() => {
    const path = location.pathname + location.search;
    const titles: Record<string, string> = {
      '/': 'Landing',
      '/login': 'Login',
      '/app': 'Dashboard',
      '/app/gallery': 'Gallery',
      '/app/profile': 'Profile',
      '/terms': 'Terms',
      '/privacy': 'Privacy',
      '/refund-policy': 'Refund Policy',
      '/cookie-policy': 'Cookie Policy',
    };
    const base = location.pathname.split('/')[1] || '/';
    const title = titles[location.pathname] ?? titles[`/${base}`] ?? location.pathname;
    pageView(path, title);
    metaPageView();
  }, [location]);
  return null;
}

/** URL'de OAuth state hatası varsa /login'e yönlendirir (bad_oauth_state). */
function OAuthErrorHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('error_code');
    const error = params.get('error');
    if (code === 'bad_oauth_state' || (error === 'invalid_request' && params.get('error_description')?.includes('state'))) {
      navigate('/login', { state: { oauthError: 'state_expired' }, replace: true });
    }
  }, [location.search, navigate]);
  return null;
}

const LANG_OPTIONS: { code: Language; flag: string; label: string }[] = [
  { code: 'tr', flag: '🇹🇷', label: 'Türkçe' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
];

const LOGIN_SLIDER_FALLBACK: { image_url: string }[] = [
  { image_url: 'https://picsum.photos/seed/dreemart1/800/600' },
  { image_url: 'https://picsum.photos/seed/dreemart2/800/600' },
  { image_url: 'https://picsum.photos/seed/dreemart3/800/600' },
];

function LoginPage() {
  const { signInWithGoogle, user, loading } = useAuth();
  const location = useLocation();
  const [message, setMessage] = useState<string | null>(null);
  const [sliderExamples, setSliderExamples] = useState<{ image_url: string }[]>(LOGIN_SLIDER_FALLBACK);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [lang, setLang] = useState<Language>(() => {
    try {
      const s = typeof localStorage !== 'undefined' ? localStorage.getItem('dreemart_lang') : null;
      if (s === 'tr' || s === 'en' || s === 'es' || s === 'de') return s;
    } catch {}
    return 'tr';
  });
  const [langOpen, setLangOpen] = useState(false);
  const oauthError = (location.state as { oauthError?: string } | null)?.oauthError;
  const t = LANDING[lang];

  useEffect(() => {
    if (!supabase) return;
    supabase.from('landing_examples').select('image_url').order('sort_order').then(({ data }) => {
      if (data && data.length >= 1) setSliderExamples(data);
    });
  }, []);

  useEffect(() => {
    const slides = sliderExamples.length;
    if (slides <= 1) return;
    const id = setInterval(() => setSliderIndex((i) => (i + 1) % slides), 4500);
    return () => clearInterval(id);
  }, [sliderExamples.length]);

  const handleLoginClick = () => {
    if (supabase) {
      setMessage(null);
      signInWithGoogle();
    } else {
      setMessage(t.loginBackendError);
    }
  };

  const setLangAndPersist = (l: Language) => {
    setLang(l);
    setLangOpen(false);
    try {
      localStorage.setItem('dreemart_lang', l);
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D17] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gold-500/30 border-t-gold-400" />
      </div>
    );
  }
  if (user) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen bg-[#0B0D17] flex flex-col lg:flex-row overflow-hidden">
      {/* Sol: Slider - rüya görselleri + slogan */}
      <div className="relative flex-shrink-0 h-[35vh] sm:h-[40vh] lg:h-screen lg:w-1/2 lg:min-w-0">
        {sliderExamples.map((ex, i) => (
          <div
            key={i}
            className="absolute inset-0 login-slider-slide"
            style={{ opacity: i === sliderIndex ? 1 : 0, pointerEvents: i === sliderIndex ? 'auto' : 'none' }}
          >
            <img src={ex.image_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          </div>
        ))}
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 lg:p-10 text-white pointer-events-none">
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-white drop-shadow-lg mb-2">
            {t.loginSlogan}
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-white/90 max-w-md leading-relaxed drop-shadow-md">
            {t.loginSubtitle}
          </p>
          {sliderExamples.length > 1 && (
            <div className="flex gap-1.5 mt-4 lg:mt-6 pointer-events-auto">
              {sliderExamples.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => setSliderIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === sliderIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sağ: Login alanı */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-950/50 via-[#0B0D17] to-black lg:overflow-y-auto relative">
        {/* Dil seçici */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm min-h-[44px] touch-manipulation"
              aria-label={LANG_OPTIONS.find((o) => o.code === lang)?.label}
            >
              <span className="text-base">{LANG_OPTIONS.find((o) => o.code === lang)?.flag}</span>
              <span className="text-gray-200 text-xs sm:text-sm max-w-[70px] truncate hidden sm:inline">{LANG_OPTIONS.find((o) => o.code === lang)?.label}</span>
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
                        onClick={() => setLangAndPersist(opt.code)}
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
        </div>
        <div className="w-full max-w-sm animate-slide-up">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-sm">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(129,140,248,0.4)]">
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-100 via-white to-purple-200 mb-2">Dreemart</h1>
            <p className="text-gray-400 text-xs sm:text-sm mb-6 sm:mb-8">{t.loginFormSubtitle}</p>
            {oauthError === 'state_expired' && (
              <p className="mb-4 text-sm text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-left">
                {t.loginOauthError}
              </p>
            )}
            <button
              onClick={handleLoginClick}
              className="w-full py-3.5 sm:py-4 rounded-xl bg-white text-gray-900 font-bold hover:bg-gray-100 active:scale-[0.98] transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-[#0B0D17] flex items-center justify-center gap-2 min-h-[48px] touch-manipulation"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              {t.loginButton}
            </button>
            <p className="mt-2 text-xs text-gray-500">{t.loginSignupNote}</p>
            {message && (
              <p className="mt-4 text-sm text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-left">
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminLoginPage() {
  const { signInWithGoogle, user, profile, loading } = useAuth();
  const [message, setMessage] = useState<string | null>(null);

  const handleLoginClick = () => {
    if (supabase) {
      setMessage(null);
      signInWithGoogle(`/${ADMIN_PATH}`);
    } else {
      setMessage('Backend henüz bağlı değil. .env dosyasına VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ekleyin.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D17] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-indigo-500/30 border-t-indigo-400" />
      </div>
    );
  }
  if (user) {
    const isAdmin = profile?.role === 'admin';
    if (isAdmin) return <Navigate to={`/${ADMIN_PATH}`} replace />;
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-950 via-[#0B0D17] to-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[80vw] max-w-md h-[80vw] max-h-md bg-indigo-600/15 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] max-w-sm h-[60vw] max-h-sm bg-gray-600/10 rounded-full blur-[80px]" />
      <div className="relative w-full max-w-sm">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-sm">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-indigo-600 flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Yönetim Ofisi</h1>
          <p className="text-gray-400 text-sm mb-6">Dreemart Admin Paneli – Sadece yetkili hesaplar girebilir</p>
          <button
            onClick={handleLoginClick}
            className="w-full py-3.5 rounded-xl bg-white text-gray-900 font-bold hover:bg-gray-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[48px]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google ile Giriş Yap
          </button>
          <a href="/" className="mt-4 block text-sm text-gray-500 hover:text-gray-400 transition-colors">← Ana sayfaya dön</a>
          {message && (
            <p className="mt-4 text-sm text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-left">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AnalyticsPageView />
        <OAuthErrorHandler />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/terms" element={<LegalPage />} />
          <Route path="/privacy" element={<LegalPage />} />
          <Route path="/refund-policy" element={<LegalPage />} />
          <Route path="/cookie-policy" element={<LegalPage />} />
          <Route path={`/${ADMIN_PATH}/login`} element={<AdminLoginPage />} />
          <Route path={`/${ADMIN_PATH}/*`} element={<AdminRoute><AdminApp /></AdminRoute>} />
          <Route path="/app/*" element={<ProtectedRoute><MainApp /></ProtectedRoute>} />
          <Route path="/" element={<LandingOrApp />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
