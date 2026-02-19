import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, User, Ban, CheckCircle, Loader2, Filter } from 'lucide-react';

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  credits: number;
  role: string;
  tier: string;
  language: string;
  is_banned: boolean;
  created_at: string;
  last_purchased_pack_id?: string | null;
  pricing_packs?: { name: string } | null;
}

type RoleFilter = 'all' | 'user' | 'admin';
type StatusFilter = 'all' | 'active' | 'banned';
type TierFilter = 'all' | 'free' | 'pro';
type LanguageFilter = 'all' | 'tr' | 'en' | 'es' | 'de';
type DateRangeKey = 'all' | '7' | '30' | '90';

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'user', label: 'Kullanıcı' },
  { value: 'admin', label: 'Admin' },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'active', label: 'Aktif' },
  { value: 'banned', label: 'Yasaklı' },
];

const TIER_OPTIONS: { value: TierFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
];

const LANGUAGE_OPTIONS: { value: LanguageFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'tr', label: 'TR' },
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
  { value: 'de', label: 'DE' },
];

const DATE_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: '7', label: 'Son 7 gün' },
  { value: '30', label: 'Son 30 gün' },
  { value: '90', label: 'Son 90 gün' },
];

function isInDateRange(createdAt: string, range: DateRangeKey): boolean {
  if (range === 'all') return true;
  const d = new Date(createdAt);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - parseInt(range, 10));
  return d >= cutoff;
}

export default function AdminUsers() {
  const [list, setList] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [banConfirm, setBanConfirm] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [noBackend, setNoBackend] = useState(false);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>('all');
  const [dateRange, setDateRange] = useState<DateRangeKey>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setList([]);
      setNoBackend(true);
      setLoading(false);
      return;
    }
    supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, credits, role, tier, language, is_banned, created_at, last_purchased_pack_id, pricing_packs(name)')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setList((data || []) as ProfileRow[]);
        setLoading(false);
      });
  }, []);

  const filtered = list.filter((p) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!(p.email?.toLowerCase().includes(q) ?? false) && !(p.full_name?.toLowerCase().includes(q) ?? false))
        return false;
    }
    if (roleFilter !== 'all' && p.role !== roleFilter) return false;
    if (statusFilter === 'active' && p.is_banned) return false;
    if (statusFilter === 'banned' && !p.is_banned) return false;
    if (tierFilter !== 'all' && (p.tier || 'free') !== tierFilter) return false;
    if (languageFilter !== 'all' && (p.language || 'tr') !== languageFilter) return false;
    if (!isInDateRange(p.created_at, dateRange)) return false;
    return true;
  });

  const toggleBan = async (id: string, isBanned: boolean) => {
    if (!supabase) return;
    setBanConfirm(null);
    setSavingId(id);
    await supabase
      .from('profiles')
      .update({ is_banned: !isBanned, banned_at: !isBanned ? new Date().toISOString() : null })
      .eq('id', id);
    setList((prev) => prev.map((p) => (p.id === id ? { ...p, is_banned: !isBanned } : p)));
    setSavingId(null);
  };

  const setCredits = async (id: string, credits: number) => {
    if (!supabase) return;
    setSavingId(id);
    await supabase.from('profiles').update({ credits, updated_at: new Date().toISOString() }).eq('id', id);
    setList((prev) => prev.map((p) => (p.id === id ? { ...p, credits } : p)));
    setSavingId(null);
  };

  const hasActiveFilters = roleFilter !== 'all' || statusFilter !== 'all' || tierFilter !== 'all' || languageFilter !== 'all' || dateRange !== 'all';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Kullanıcılar</h1>
        <p className="text-gray-400 text-sm mt-1">Kullanıcı listesi, kredi ve yasaklama</p>
      </div>

      {noBackend && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-200">
          Backend bağlı değil. Kullanıcı listesi yüklenemiyor.
        </div>
      )}

      {/* Arama + Filtreler */}
      <div className="flex flex-col sm:flex-row gap-4">
        {supabase && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="E-posta veya ad ile ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
            />
          </div>
        )}
        {supabase && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${showFilters || hasActiveFilters ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
            >
              <Filter className="w-4 h-4" />
              Filtreler
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-indigo-400" />}
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setRoleFilter('all');
                  setStatusFilter('all');
                  setTierFilter('all');
                  setLanguageFilter('all');
                  setDateRange('all');
                }}
                className="text-sm text-gray-400 hover:text-white"
              >
                Sıfırla
              </button>
            )}
          </div>
        )}
      </div>

      {supabase && showFilters && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <div className="flex items-center gap-2 text-gray-300 text-sm font-medium mb-3">
            <Filter className="w-4 h-4" />
            Filtreler
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rol</label>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as RoleFilter)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50">
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Durum</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50">
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Plan</label>
              <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value as TierFilter)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50">
                {TIER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Dil</label>
              <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value as LanguageFilter)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50">
                {LANGUAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Kayıt tarihi</label>
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRangeKey)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50">
                {DATE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-800 bg-gray-900/30 overflow-hidden">
        {loading ? (
          <div className="p-8 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-gray-400 text-sm">Yükleniyor...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{search.trim() || hasActiveFilters ? 'Filtreye uygun kullanıcı yok.' : 'Henüz kullanıcı yok.'}</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 border-b border-gray-800 text-sm text-gray-400">
              {filtered.length} kullanıcı listeleniyor
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-800/80 text-gray-300 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-3 font-medium">Kullanıcı</th>
                    <th className="p-3 font-medium">Kredi</th>
                    <th className="p-3 font-medium">Rol</th>
                    <th className="p-3 font-medium">Plan</th>
                    <th className="p-3 font-medium">Son paket</th>
                    <th className="p-3 font-medium">Dil</th>
                    <th className="p-3 font-medium">Durum</th>
                    <th className="p-3 font-medium text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-300 overflow-hidden flex-shrink-0">
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (p.full_name?.[0] || p.email?.[0] || '?').toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate">{p.full_name || '-'}</p>
                            <p className="text-xs text-gray-500 truncate">{p.email || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min={0}
                          value={p.credits}
                          onChange={(e) => setCredits(p.id, parseInt(e.target.value, 10) || 0)}
                          disabled={!supabase}
                          className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
                        />
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${p.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-gray-700 text-gray-300'}`}>
                          {p.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-400">{(p.tier || 'free').toLowerCase()}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-400" title={p.last_purchased_pack_id ?? ''}>
                          {p.pricing_packs?.name ?? (p.last_purchased_pack_id ? '…' : '—')}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-400 uppercase">{(p.language || 'tr')}</span>
                      </td>
                      <td className="p-3">
                        {p.is_banned ? (
                          <span className="inline-flex items-center gap-1 text-red-400 text-sm">
                            <Ban className="w-3.5 h-3.5" /> Yasaklı
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-sm">
                            <CheckCircle className="w-3.5 h-3.5" /> Aktif
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {banConfirm === p.id ? (
                          <span className="flex items-center justify-end gap-2">
                            <button onClick={() => toggleBan(p.id, p.is_banned)} className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-500">Onayla</button>
                            <button onClick={() => setBanConfirm(null)} className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600">İptal</button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setBanConfirm(p.id)}
                            disabled={savingId === p.id || !supabase}
                            className={`text-xs px-3 py-1.5 rounded font-medium ${p.is_banned ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600/80 hover:bg-red-500 text-white'} disabled:opacity-50`}
                          >
                            {savingId === p.id ? '...' : p.is_banned ? 'Aç' : 'Yasakla'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
