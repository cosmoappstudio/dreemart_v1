import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { DEMO_STORAGE_KEY, MOCK_DEMO_PROFILE } from '../lib/mockData';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  language: string;
  credits: number;
  tier: string;
  role: string;
  is_banned: boolean;
}

const DEMO_USER: User = {
  id: 'demo-user',
  email: 'demo@dreamink.app',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '',
} as User;

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isDemoMode: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfile: (p: Profile | null) => void;
  enterDemoMode: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function getInitialDemoState(): { user: User | null; profile: Profile | null; loading: boolean } {
  if (typeof window === 'undefined') return { user: null, profile: null, loading: true };
  if (sessionStorage.getItem(DEMO_STORAGE_KEY) === '1') {
    return { user: DEMO_USER, profile: MOCK_DEMO_PROFILE, loading: false };
  }
  return { user: null, profile: null, loading: true };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(getInitialDemoState().user);
  const [profile, setProfileState] = useState<Profile | null>(getInitialDemoState().profile);
  const [loading, setLoading] = useState(getInitialDemoState().loading);

  const isDemoMode = user?.id === 'demo-user';

  const setProfile = (p: Profile | null) => setProfileState(p);

  const fetchProfile = async (uid: string) => {
    if (!supabase) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    setProfileState(data as Profile | null);
  };

  const refreshProfile = async () => {
    if (user?.id && user.id !== 'demo-user') await fetchProfile(user.id);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(DEMO_STORAGE_KEY) === '1') {
      setUser(DEMO_USER);
      setProfileState(MOCK_DEMO_PROFILE);
      setLoading(false);
      return;
    }
    if (!supabase) {
      setLoading(false);
      return;
    }

    const hasAuthHash = typeof window !== 'undefined' && /#.*access_token=/.test(window.location.hash);

    const applySession = (session: { user: User } | null) => {
      setUser(session?.user ?? null);
      if (session?.user?.id) fetchProfile(session.user.id).then(() => setLoading(false));
      else setLoading(false);
      if (hasAuthHash && typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => applySession(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (sessionStorage.getItem(DEMO_STORAGE_KEY) === '1') return;
      setUser(session?.user ?? null);
      if (session?.user?.id) fetchProfile(session.user.id);
      else setProfileState(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    // Her zaman kök origin + /app kullan; path hiç eklenmesin (bazı hesaplarda yanlış redirect olmasın).
    const redirectTo = new URL('/app', window.location.origin).href;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
  };

  const signOut = async () => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(DEMO_STORAGE_KEY) === '1') {
      sessionStorage.removeItem(DEMO_STORAGE_KEY);
      setUser(null);
      setProfileState(null);
      window.location.href = '/login';
      return;
    }
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfileState(null);
  };

  const enterDemoMode = () => {
    if (typeof window !== 'undefined') sessionStorage.setItem(DEMO_STORAGE_KEY, '1');
    setUser(DEMO_USER);
    setProfileState(MOCK_DEMO_PROFILE);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isDemoMode, signInWithGoogle, signOut, refreshProfile, setProfile, enterDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
