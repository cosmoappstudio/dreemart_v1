import React, { useEffect, useMemo, useState } from 'react';
import { supabase, getApiUrl } from '../lib/supabase';
import { Search, User, Ban, CheckCircle, Loader2, Filter, Plus, X, Zap, Gift } from 'lucide-react';

const QUICK_ADD_AMOUNTS = [5, 10, 25, 50];

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
  country_code?: string | null;
}

type RoleFilter = 'all' | 'user' | 'admin';
type StatusFilter = 'all' | 'active' | 'banned';
type PackFilter = 'all' | 'has_pack' | 'no_pack';
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

const PACK_OPTIONS: { value: PackFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'has_pack', label: 'Paket almış' },
  { value: 'no_pack', label: 'Paket almamış' },
];

const LANGUAGE_OPTIONS: { value: LanguageFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'tr', label: 'TR' },
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
  { value: 'de', label: 'DE' },
];

function countryDisplayName(code: string): string {
  if (!code || code === '?') return 'Belirtilmemiş';
  try {
    return new Intl.DisplayNames(['tr'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

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

function CreditCell({ p, setCredits, addCredits, savingId, supabase }: { p: ProfileRow; setCredits: (id: string, n: number) => void; addCredits: (id: string, n: number) => void; savingId: string | null; supabase: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-amber-200 tabular-nums">{p.credits}</span>
        </span>
        <input
          type="number"
          min={0}
          value={p.credits}
          onChange={(e) => setCredits(p.id, parseInt(e.target.value, 10) || 0)}
          disabled={!supabase}
          className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
          title="Doğrudan düzenle"
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
          <Gift className="w-3 h-3" /> Hediye
        </span>
        {QUICK_ADD_AMOUNTS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => addCredits(p.id, n)}
            disabled={!supabase || savingId === p.id}
            className="px-2 py-1 rounded-lg text-xs font-medium bg-emerald-600/60 hover:bg-emerald-500/80 text-emerald-100 border border-emerald-500/30 disabled:opacity-50 transition-colors touch-manipulation"
          >
            +{n}
          </button>
        ))}
        <input
          type="number"
          min={1}
          max={999}
          placeholder="Özel"
          id={`gift-${p.id}`}
          className="w-14 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-500 focus:ring-1 focus:ring-indigo-500/50"
          onKeyDown={(e) => { if (e.key === 'Enter') { const el = document.getElementById(`gift-${p.id}`) as HTMLInputElement | null; const n = el ? parseInt(el.value, 10) : 0; if (n >= 1) addCredits(p.id, n); } }}
        />
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById(`gift-${p.id}`) as HTMLInputElement | null;
            const n = el ? parseInt(el.value, 10) : 10;
            addCredits(p.id, isNaN(n) || n < 1 ? 10 : n);
          }}
          disabled={!supabase || savingId === p.id}
          className="px-2 py-1 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 flex items-center gap-1 touch-manipulation"
          title="Hediye kredi ekle"
        >
          {savingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Ekle
        </button>
      </div>
    </div>
  );
}

function PackCell({ p, packs, addPack, removePack, savingId, supabase }: { p: ProfileRow; packs: { id: string; name: string; credits_amount: number }[]; addPack: (id: string, packId: string) => void; removePack: (id: string) => void; savingId: string | null; supabase: boolean }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[120px]">
      <span className="text-sm text-gray-400" title={p.last_purchased_pack_id ?? ''}>
        {p.pricing_packs?.name ?? (p.last_purchased_pack_id ? '…' : '—')}
      </span>
      {p.last_purchased_pack_id ? (
        <button
          type="button"
          onClick={() => removePack(p.id)}
          disabled={!supabase || savingId === p.id}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-red-600/60 hover:bg-red-500/80 text-white disabled:opacity-50 w-fit touch-manipulation"
          title="Paketi kaldır"
        >
          <X className="w-3 h-3" /> Çıkart
        </button>
      ) : (
        <div className="flex items-center gap-1 flex-wrap">
          <select
            id={`pack-${p.id}`}
            className="flex-1 min-w-0 max-w-[90px] bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white focus:ring-1 focus:ring-indigo-500/50"
          >
            {packs.map((pk) => (
              <option key={pk.id} value={pk.id}>
                {pk.name} (+{pk.credits_amount})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById(`pack-${p.id}`) as HTMLSelectElement | null;
              const packId = el?.value;
              if (packId) addPack(p.id, packId);
            }}
            disabled={!supabase || savingId === p.id || packs.length === 0}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white disabled:opacity-50 shrink-0 touch-manipulation"
            title="Paket ekle"
          >
            <Plus className="w-3 h-3" /> Ekle
          </button>
        </div>
      )}
    </div>
  );
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
  const [packFilter, setPackFilter] = useState<PackFilter>('all');
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>('all');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRangeKey>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);
  const [packs, setPacks] = useState<{ id: string; name: string; credits_amount: number }[]>([]);

  useEffect(() => {
    if (!supabase) {
      setList([]);
      setNoBackend(true);
      setLoading(false);
      return;
    }
    supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, credits, role, tier, language, is_banned, created_at, last_purchased_pack_id, pricing_packs(name), country_code')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        const rows: ProfileRow[] = (data || []).map((row: Record<string, unknown>) => ({
          ...row,
          pricing_packs: Array.isArray(row.pricing_packs) ? (row.pricing_packs[0] as { name: string } | undefined) ?? null : (row.pricing_packs as { name: string } | null) ?? null,
        })) as ProfileRow[];
        setList(rows);
        setLoading(false);
      });
    supabase.from('pricing_packs').select('id, name, credits_amount').order('sort_order').then(({ data }) => {
      setPacks((data || []) as { id: string; name: string; credits_amount: number }[]);
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
    if (packFilter === 'has_pack' && !p.last_purchased_pack_id) return false;
    if (packFilter === 'no_pack' && p.last_purchased_pack_id) return false;
    if (languageFilter !== 'all' && (p.language || 'tr') !== languageFilter) return false;
    if (countryFilter && (p.country_code || '').toLowerCase() !== countryFilter.toLowerCase()) return false;
    if (!isInDateRange(p.created_at, dateRange)) return false;
    if (dateFrom && p.created_at < dateFrom) return false;
    if (dateTo && p.created_at > (dateTo + 'T23:59:59.999Z')) return false;
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
    setCreditError(null);
    setSavingId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setCreditError('Oturum bulunamadı. Yeniden giriş yapın.');
        setSavingId(null);
        return;
      }
      const res = await fetch(getApiUrl('/api/admin/set-credits'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId: id, credits }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreditError(data?.error || `Kredi güncellenemedi (${res.status})`);
        setSavingId(null);
        return;
      }
      setList((prev) => prev.map((p) => (p.id === id ? { ...p, credits: data.credits ?? credits } : p)));
    } catch (e) {
      setCreditError(e instanceof Error ? e.message : 'Bağlantı hatası');
    }
    setSavingId(null);
  };

  /** Satın alma olmadan hediye kredi: mevcut bakiyeye ekler */
  const addCredits = async (id: string, amount: number) => {
    if (!supabase || amount < 1) return;
    const user = list.find((p) => p.id === id);
    if (!user) return;
    setCreditError(null);
    setSavingId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setCreditError('Oturum bulunamadı. Yeniden giriş yapın.');
        setSavingId(null);
        return;
      }
      const res = await fetch(getApiUrl('/api/admin/set-credits'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId: id, addCredits: amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreditError(data?.error || `Kredi eklenemedi (${res.status})`);
        setSavingId(null);
        return;
      }
      const newTotal = data.credits ?? (user.credits ?? 0) + amount;
      setList((prev) => prev.map((p) => (p.id === id ? { ...p, credits: newTotal } : p)));
    } catch (e) {
      setCreditError(e instanceof Error ? e.message : 'Bağlantı hatası');
    }
    setSavingId(null);
  };

  /** Kullanıcıya paket uygula: kredi ekler + last_purchased_pack_id set eder (tüm ressamlara erişim) */
  const addPack = async (id: string, packId: string) => {
    if (!supabase || !packId) return;
    setCreditError(null);
    setSavingId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setCreditError('Oturum bulunamadı. Yeniden giriş yapın.');
        setSavingId(null);
        return;
      }
      const res = await fetch(getApiUrl('/api/admin/set-credits'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId: id, addPack: { packId } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreditError(data?.error || `Paket eklenemedi (${res.status})`);
        setSavingId(null);
        return;
      }
      const pack = packs.find((x) => x.id === packId);
      setList((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                credits: data.credits ?? p.credits,
                last_purchased_pack_id: packId,
                pricing_packs: pack ? { name: pack.name } : p.pricing_packs,
              }
            : p
        )
      );
    } catch (e) {
      setCreditError(e instanceof Error ? e.message : 'Bağlantı hatası');
    }
    setSavingId(null);
  };

  /** Paketi kaldır: last_purchased_pack_id = null (kullanıcı tekrar sadece ilk N ressama erişir) */
  const removePack = async (id: string) => {
    if (!supabase) return;
    setCreditError(null);
    setSavingId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setCreditError('Oturum bulunamadı. Yeniden giriş yapın.');
        setSavingId(null);
        return;
      }
      const res = await fetch(getApiUrl('/api/admin/set-credits'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId: id, removePack: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreditError(data?.error || `Paket kaldırılamadı (${res.status})`);
        setSavingId(null);
        return;
      }
      setList((prev) =>
        prev.map((p) => (p.id === id ? { ...p, last_purchased_pack_id: null, pricing_packs: null } : p))
      );
    } catch (e) {
      setCreditError(e instanceof Error ? e.message : 'Bağlantı hatası');
    }
    setSavingId(null);
  };

  const hasActiveFilters = roleFilter !== 'all' || statusFilter !== 'all' || packFilter !== 'all' || languageFilter !== 'all' || !!countryFilter || dateRange !== 'all' || !!dateFrom || !!dateTo;

  const countryOptions = useMemo(() => {
    const codes = new Set<string>();
    list.forEach((p) => {
      const c = p.country_code?.trim();
      if (c) codes.add(c);
    });
    return Array.from(codes).sort((a, b) => countryDisplayName(a).localeCompare(countryDisplayName(b)));
  }, [list]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Kullanıcılar</h1>
        <p className="text-gray-400 text-xs sm:text-sm mt-1">Kullanıcı listesi, kredi ve paket yönetimi</p>
      </div>

      {noBackend && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-200">
          Backend bağlı değil. Kullanıcı listesi yüklenemiyor.
        </div>
      )}

      {creditError && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-200 flex items-center justify-between gap-3">
          <span>{creditError}</span>
          <button type="button" onClick={() => setCreditError(null)} className="text-red-300 hover:text-white shrink-0">
            Kapat
          </button>
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
                  setPackFilter('all');
                  setLanguageFilter('all');
                  setCountryFilter('');
                  setDateRange('all');
                  setDateFrom('');
                  setDateTo('');
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
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
              <label className="block text-xs text-gray-500 mb-1">Kredi paketi</label>
              <select value={packFilter} onChange={(e) => setPackFilter(e.target.value as PackFilter)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50">
                {PACK_OPTIONS.map((o) => (
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
              <label className="block text-xs text-gray-500 mb-1">Ülke</label>
              <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50">
                <option value="">Tümü</option>
                {countryOptions.map((code) => (
                  <option key={code} value={code}>{countryDisplayName(code)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Kayıt (son X gün)</label>
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRangeKey)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50">
                {DATE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tarih aralığı (başlangıç)</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tarih aralığı (bitiş)</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50"
              />
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
            <div className="px-3 sm:px-4 py-2 border-b border-gray-800 text-xs sm:text-sm text-gray-400">
              {filtered.length} kullanıcı listeleniyor
            </div>
            {/* Masaüstü: tablo */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead className="bg-gray-800/80 text-gray-300 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-3 font-medium">Kullanıcı</th>
                    <th className="p-3 font-medium">Kredi</th>
                    <th className="p-3 font-medium">Rol</th>
                    <th className="p-3 font-medium">Son paket</th>
                    <th className="p-3 font-medium">Dil</th>
                    <th className="p-3 font-medium">Ülke</th>
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
                        <CreditCell p={p} setCredits={setCredits} addCredits={addCredits} savingId={savingId} supabase={!!supabase} />
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${p.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-gray-700 text-gray-300'}`}>
                          {p.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <PackCell p={p} packs={packs} addPack={addPack} removePack={removePack} savingId={savingId} supabase={!!supabase} />
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-400 uppercase">{(p.language || 'tr')}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-400">{p.country_code ? countryDisplayName(p.country_code) : '—'}</span>
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

            {/* Mobil: kartlar */}
            <div className="lg:hidden divide-y divide-gray-800">
              {filtered.map((p) => (
                <div key={p.id} className="p-4 hover:bg-gray-800/20 transition-colors">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-300 overflow-hidden flex-shrink-0">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (p.full_name?.[0] || p.email?.[0] || '?').toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white truncate">{p.full_name || '-'}</p>
                        <p className="text-xs text-gray-500 truncate">{p.email || '-'}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${p.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-gray-700 text-gray-300'}`}>
                            {p.role}
                          </span>
                          <span className="text-xs text-gray-500 uppercase">{(p.language || 'tr')}</span>
                          {p.country_code && (
                            <span className="text-xs text-gray-400">{countryDisplayName(p.country_code)}</span>
                          )}
                          {p.is_banned ? (
                            <span className="inline-flex items-center gap-1 text-red-400 text-xs">
                              <Ban className="w-3 h-3" /> Yasaklı
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                              <CheckCircle className="w-3 h-3" /> Aktif
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {banConfirm === p.id ? (
                        <span className="flex items-center gap-2">
                          <button onClick={() => toggleBan(p.id, p.is_banned)} className="text-xs px-2 py-1.5 rounded bg-red-600 text-white hover:bg-red-500 touch-manipulation">Onayla</button>
                          <button onClick={() => setBanConfirm(null)} className="text-xs px-2 py-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 touch-manipulation">İptal</button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setBanConfirm(p.id)}
                          disabled={savingId === p.id || !supabase}
                          className={`text-xs px-3 py-1.5 rounded font-medium touch-manipulation min-h-[44px] ${p.is_banned ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600/80 hover:bg-red-500 text-white'} disabled:opacity-50`}
                        >
                          {savingId === p.id ? '...' : p.is_banned ? 'Aç' : 'Yasakla'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Kredi</p>
                      <CreditCell p={p} setCredits={setCredits} addCredits={addCredits} savingId={savingId} supabase={!!supabase} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Son paket</p>
                      <PackCell p={p} packs={packs} addPack={addPack} removePack={removePack} savingId={savingId} supabase={!!supabase} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
