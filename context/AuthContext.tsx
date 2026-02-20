import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  language: string;
  credits: number;
  tier: string;
  role: string;
  is_banned: boolean;
  last_purchased_pack_id?: string | null;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: (redirectPath?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfile: (p: Profile | null) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const setProfile = (p: Profile | null) => setProfileState(p);

  const fetchProfile = async (uid: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, username, credits, role, tier, language, is_banned, last_purchased_pack_id')
      .eq('id', uid)
      .single();
    if (error) {
      console.warn('fetchProfile error:', error);
      return;
    }
    let profileData = data as Profile | null;
    if (profileData && (profileData.username == null || profileData.username.trim() === '')) {
      const username = 'rüyacı_' + Math.random().toString(36).slice(2, 12);
      const { error: updateErr } = await supabase.from('profiles').update({ username, updated_at: new Date().toISOString() }).eq('id', uid);
      if (!updateErr) profileData = { ...profileData, username };
    }
    setProfileState(profileData);
  };

  const refreshProfile = async () => {
    if (user?.id) await fetchProfile(user.id);
  };

  // Supabase Realtime: profiles değişince (admin kredi vb.) anında güncelle, sayfa yenilemeye gerek yok
  useEffect(() => {
    if (!supabase || !user?.id) return;
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row && typeof row === 'object') {
            setProfileState({
              id: String(row.id ?? ''),
              email: row.email as string | null,
              full_name: row.full_name as string | null,
              avatar_url: row.avatar_url as string | null,
              username: row.username as string | null,
              credits: Number(row.credits ?? 0),
              role: String(row.role ?? 'user'),
              tier: String(row.tier ?? 'free'),
              language: String(row.language ?? 'tr'),
              is_banned: Boolean(row.is_banned),
              last_purchased_pack_id: (row.last_purchased_pack_id as string | null) ?? null,
            });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  useEffect(() => {
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
      setUser(session?.user ?? null);
      if (session?.user?.id) fetchProfile(session.user.id);
      else setProfileState(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async (redirectPath?: string) => {
    if (!supabase) return;
    const path = redirectPath ?? '/app';
    const redirectTo = new URL(path, window.location.origin).href;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfileState(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, refreshProfile, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
