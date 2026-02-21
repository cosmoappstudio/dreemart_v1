import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { pageView } from './lib/analytics';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
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

function LoginPage() {
  const { signInWithGoogle, user, loading } = useAuth();
  const location = useLocation();
  const [message, setMessage] = useState<string | null>(null);
  const oauthError = (location.state as { oauthError?: string } | null)?.oauthError;

  const handleLoginClick = () => {
    if (supabase) {
      setMessage(null);
      signInWithGoogle();
    } else {
      setMessage('Backend henüz bağlı değil. .env dosyasına VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY eklediğinde Google girişi çalışacak.');
    }
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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-[#0B0D17] to-black flex items-center justify-center p-3 sm:p-4 relative overflow-x-hidden overflow-y-auto">
      {/* Background orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[80vw] max-w-md h-[80vw] max-h-md bg-purple-600/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] max-w-sm h-[60vw] max-h-sm bg-amber-600/15 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="relative w-full max-w-sm">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-sm animate-slide-up">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(129,140,248,0.4)]">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-100 via-white to-purple-200 mb-2">Dreemart</h1>
          <p className="text-gray-400 text-xs sm:text-sm mb-6 sm:mb-8">Rüyalarını ünlü ressamların tarzında sanata dönüştür, yorumunu al.</p>
          {oauthError === 'state_expired' && (
            <p className="mb-4 text-sm text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-left">
              Giriş oturumu sona erdi veya geçersiz. Lütfen tekrar &quot;Google ile Giriş Yap / Kayıt Ol&quot; butonuna tıklayın ve aynı sekmede tamamlayın.
            </p>
          )}
          <button
            onClick={handleLoginClick}
            className="w-full py-3.5 sm:py-4 rounded-xl bg-white text-gray-900 font-bold hover:bg-gray-100 active:scale-[0.98] transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-[#0B0D17] flex items-center justify-center gap-2 min-h-[48px] touch-manipulation"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google ile Giriş Yap / Kayıt Ol
          </button>
          <p className="mt-2 text-xs text-gray-500">Hesabın yoksa aynı butonla kayıt olursun.</p>
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
