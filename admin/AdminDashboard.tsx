import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Image, Palette, TrendingUp, Calendar, Filter, DollarSign, Package, RotateCcw } from 'lucide-react';
import { DateRangePicker, defaultDateRangeValue, getDateRangeISO, type DateRangeValue } from './DateRangePicker';

interface Stats {
  users: number;
  dreams: number;
  artists: number;
  dreamsInPeriod: number;
  revenue: number;
  packagePurchases: number;
  refunds: number;
  revenueCompare: number;
  packagePurchasesCompare: number;
  refundsCompare: number;
}

interface RecentDream {
  id: string;
  created_at?: string;
  prompt?: string;
  user_id?: string;
  image_url?: string | null;
  moderation_status?: string;
  artist_id?: string;
  artists?: { name: string } | { name: string }[] | null;
  profiles?: { email: string | null; full_name: string | null; last_purchased_pack_id: string | null } | Array<{ email: string | null; full_name: string | null; last_purchased_pack_id: string | null }> | null;
  // PostgREST bazen tekil ilişki adı döner
  artist?: { name: string } | null;
  profile?: { email: string | null; full_name: string | null; last_purchased_pack_id: string | null } | null;
}

function getArtistFromDream(dream: RecentDream): { name: string } | null | undefined {
  const a = Array.isArray(dream.artists) ? dream.artists[0] : dream.artists;
  return a ?? dream.artist ?? null;
}
function getProfileFromDream(dream: RecentDream): { email: string | null; full_name: string | null; last_purchased_pack_id: string | null } | null | undefined {
  const p = Array.isArray(dream.profiles) ? dream.profiles[0] : dream.profiles;
  return p ?? dream.profile ?? null;
}

function parseAmount(amount: string | null, currency: string): number {
  if (!amount) return 0;
  const n = parseFloat(String(amount).replace(/[^0-9.-]/g, ''));
  if (isNaN(n)) return 0;
  return (currency && ['JPY', 'KRW', 'VND'].includes(currency.toUpperCase())) ? n : n / 100;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    users: 0, dreams: 0, artists: 0, dreamsInPeriod: 0,
    revenue: 0, packagePurchases: 0, refunds: 0,
    revenueCompare: 0, packagePurchasesCompare: 0, refundsCompare: 0,
  });
  const [recentDreams, setRecentDreams] = useState<RecentDream[]>([]);
  const [packNames, setPackNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [noBackend, setNoBackend] = useState(false);
  const [dateRangeValue, setDateRangeValue] = useState<DateRangeValue>(() => defaultDateRangeValue(true));
  const [filterCountry, setFilterCountry] = useState<string>('');
  const [filterPackId, setFilterPackId] = useState<string>('');
  const [filterArtistId, setFilterArtistId] = useState<string>('');
  const [artistList, setArtistList] = useState<{ id: string; name: string }[]>([]);
  const [countryList, setCountryList] = useState<string[]>([]);

  const { from: fromDate, to: toDate, compareFrom, compareTo } = getDateRangeISO(dateRangeValue);

  useEffect(() => {
    if (!supabase) {
      setStats((s) => ({ ...s, users: 12, dreams: 48, artists: 7, dreamsInPeriod: 14 }));
      setRecentDreams([]);
      setNoBackend(true);
      setLoading(false);
      return;
    }
    setLoading(true);

    (async () => {
      let baseDreams = supabase.from('dreams').select(`
        id, created_at, prompt, user_id, image_url, moderation_status, artist_id,
        artist:artists(name),
        profile:profiles(email, full_name, last_purchased_pack_id)
      `, { count: 'exact' });
      if (fromDate) baseDreams = baseDreams.gte('created_at', fromDate);
      if (toDate) baseDreams = baseDreams.lte('created_at', toDate);
      if (filterArtistId) baseDreams = baseDreams.eq('artist_id', filterArtistId);

      let salesMain = supabase.from('lemon_squeezy_sales').select('id, amount, currency_code');
      if (fromDate) salesMain = salesMain.gte('created_at', fromDate);
      if (toDate) salesMain = salesMain.lte('created_at', toDate);
      if (filterCountry) salesMain = salesMain.eq('country_code', filterCountry);
      if (filterPackId) salesMain = salesMain.eq('pack_id', filterPackId);

      let salesCompare = supabase.from('lemon_squeezy_sales').select('id, amount, currency_code');
      if (dateRangeValue.compareEnabled && compareFrom && compareTo) {
        salesCompare = salesCompare.gte('created_at', compareFrom).lte('created_at', compareTo);
        if (filterCountry) salesCompare = salesCompare.eq('country_code', filterCountry);
        if (filterPackId) salesCompare = salesCompare.eq('pack_id', filterPackId);
      }

      const [
        u, d, a, countInPeriod, recent, packsRes,
        salesMainRes, salesCompareRes,
        refundsMain, refundsCompareRes,
        artistsRes, countriesRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('dreams').select('id', { count: 'exact', head: true }),
        supabase.from('artists').select('id', { count: 'exact', head: true }),
        baseDreams.select('id', { count: 'exact', head: true }),
        baseDreams.order('created_at', { ascending: false }).limit(50),
        supabase.from('pricing_packs').select('id, name'),
        salesMain,
        dateRangeValue.compareEnabled && compareFrom && compareTo ? salesCompare : Promise.resolve({ data: [] }),
        supabase.from('credit_transactions').select('id', { count: 'exact', head: true }).eq('reason', 'refund').gte('created_at', fromDate).lte('created_at', toDate),
        dateRangeValue.compareEnabled && compareFrom && compareTo
          ? supabase.from('credit_transactions').select('id', { count: 'exact', head: true }).eq('reason', 'refund').gte('created_at', compareFrom).lte('created_at', compareTo)
          : Promise.resolve({ count: 0 }),
        supabase.from('artists').select('id, name').order('name'),
        supabase.from('lemon_squeezy_sales').select('country_code'),
      ]);

      const packs = (packsRes.data ?? []) as { id: string; name: string }[];
      setPackNames(Object.fromEntries(packs.map((p) => [p.id, p.name])));
      setArtistList((artistsRes.data ?? []) as { id: string; name: string }[]);
      const countryRows = (countriesRes.data ?? []) as { country_code: string | null }[];
      setCountryList([...new Set(countryRows.map((r) => r.country_code).filter(Boolean) as string[])].sort());

      const mainSales = (salesMainRes.data ?? []) as { amount: string | null; currency_code: string }[];
      const compareSales = (salesCompareRes.data ?? []) as { amount: string | null; currency_code: string }[];
      const revMain = mainSales.reduce((s, x) => s + parseAmount(x.amount, x.currency_code), 0);
      const revCompare = compareSales.reduce((s, x) => s + parseAmount(x.amount, x.currency_code), 0);

      let recentData = (recent.data ?? []) as RecentDream[];
      if (filterPackId) {
        recentData = recentData.filter((x) => getProfileFromDream(x)?.last_purchased_pack_id === filterPackId);
      }

      setStats({
        users: u.count ?? 0,
        dreams: d.count ?? 0,
        artists: a.count ?? 0,
        dreamsInPeriod: countInPeriod.count ?? 0,
        revenue: revMain,
        packagePurchases: mainSales.length,
        refunds: refundsMain.count ?? 0,
        revenueCompare: revCompare,
        packagePurchasesCompare: compareSales.length,
        refundsCompare: (refundsCompareRes as { count?: number })?.count ?? 0,
      });
      setRecentDreams(recentData);
      setLoading(false);
    })();
  }, [fromDate, toDate, compareFrom, compareTo, dateRangeValue.compareEnabled, filterCountry, filterPackId, filterArtistId]);

  const formatMoney = (n: number) => (n >= 0 ? `$${n.toFixed(2)}` : `-$${(-n).toFixed(2)}`);
  const delta = (curr: number, prev: number) => (prev === 0 ? (curr === 0 ? 0 : 100) : Math.round(((curr - prev) / prev) * 100));
  const compareLabel = dateRangeValue.compareEnabled ? (dateRangeValue.compareType === 'previous_7' ? 'önceki 7 gün' : dateRangeValue.compareType === 'previous_year' ? 'önceki yıl' : 'önceki dönem') : '';

  const cards = [
    { label: 'Toplam Kullanıcı', value: stats.users, icon: Users, color: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-300', compare: null as number | null },
    { label: 'Toplam Rüya', value: stats.dreams, icon: Image, color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-300', compare: null as number | null },
    { label: 'Ressam Sayısı', value: stats.artists, icon: Palette, color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-300', compare: null as number | null },
    { label: dateRangeValue.presetLabel, value: stats.dreamsInPeriod, icon: TrendingUp, color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-300', compare: null as number | null },
    { label: 'Gelir', value: formatMoney(stats.revenue), icon: DollarSign, color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-300', compare: dateRangeValue.compareEnabled ? delta(stats.revenue, stats.revenueCompare) : null, sub: dateRangeValue.compareEnabled ? `${formatMoney(stats.revenueCompare)} ${compareLabel}` : undefined },
    { label: 'Paket satın alımı', value: stats.packagePurchases, icon: Package, color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-300', compare: dateRangeValue.compareEnabled ? delta(stats.packagePurchases, stats.packagePurchasesCompare) : null, sub: dateRangeValue.compareEnabled ? `${stats.packagePurchasesCompare} ${compareLabel}` : undefined },
    { label: 'İadeler', value: stats.refunds, icon: RotateCcw, color: 'from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-300', compare: dateRangeValue.compareEnabled ? delta(stats.refunds, stats.refundsCompare) : null, sub: dateRangeValue.compareEnabled ? `${stats.refundsCompare} ${compareLabel}` : undefined },
  ];

  if (loading && !noBackend) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-800/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Genel istatistikler ve son aktivite</p>
      </div>

      {noBackend && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-200">
          Backend bağlı değil. Örnek veriler gösteriliyor.
        </div>
      )}

      {/* Filtreler */}
      {supabase && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <div className="flex items-center gap-2 text-gray-300 text-sm font-medium mb-3">
            <Filter className="w-4 h-4" />
            Filtreler
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="relative">
              <label className="block text-xs text-gray-500 mb-1">Tarih aralığı</label>
              <DateRangePicker
                value={dateRangeValue}
                onChange={setDateRangeValue}
                triggerLabel={`${dateRangeValue.presetLabel} ${dateRangeValue.from ? new Date(dateRangeValue.from + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : ''} – ${dateRangeValue.to ? new Date(dateRangeValue.to + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}`}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ülke</label>
              <select
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50 min-w-[140px]"
              >
                <option value="">Tümü</option>
                {countryList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Paket</label>
              <select
                value={filterPackId}
                onChange={(e) => setFilterPackId(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50 min-w-[160px]"
              >
                <option value="">Tümü</option>
                {Object.entries(packNames).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ressam</label>
              <select
                value={filterArtistId}
                onChange={(e) => setFilterArtistId(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50 min-w-[160px]"
              >
                <option value="">Tümü</option>
                {artistList.map((ar) => (
                  <option key={ar.id} value={ar.id}>{ar.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {cards.map(({ label, value, icon: Icon, color, compare, sub }) => (
          <div key={label} className={`rounded-xl border bg-gradient-to-br ${color} p-5`}>
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium opacity-90">{label}</p>
                <p className="text-2xl font-bold mt-1 truncate">{value}</p>
                {sub != null && <p className="text-xs opacity-80 mt-0.5">{sub}</p>}
                {compare != null && (
                  <p className={`text-xs font-medium mt-1 ${compare > 0 ? 'text-emerald-400' : compare < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                    {compare > 0 ? '+' : ''}{compare}%
                  </p>
                )}
              </div>
              <div className="p-2 rounded-lg bg-white/10 flex-shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Son rüyalar - detaylı */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-white">Son Üretilen Rüyalar</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          {recentDreams.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">Filtreye uygun rüya kaydı yok.</div>
          ) : (
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase">
                  <th className="px-4 py-3 font-medium">Görsel</th>
                  <th className="px-4 py-3 font-medium">Rüya</th>
                  <th className="px-4 py-3 font-medium">Kullanıcı</th>
                  <th className="px-4 py-3 font-medium">Ressam</th>
                  <th className="px-4 py-3 font-medium">Paket</th>
                  <th className="px-4 py-3 font-medium">Tarih</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {recentDreams.map((dream) => (
                  <tr key={dream.id} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      {dream.image_url ? (
                        <a href={dream.image_url} target="_blank" rel="noopener noreferrer" className="block w-16 h-16 rounded-lg overflow-hidden bg-gray-800">
                          <img src={dream.image_url} alt="" className="w-full h-full object-cover" />
                        </a>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center text-gray-600 text-xs">-</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-300 max-w-[200px] truncate" title={dream.prompt ?? ''}>
                        {dream.prompt || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-300">
                        {(() => {
                          const p = getProfileFromDream(dream);
                          return (
                            <>
                              <span className="font-medium text-white">{p?.full_name || p?.email || '-'}</span>
                              {p?.email && p?.full_name && (
                                <div className="text-xs text-gray-500 truncate max-w-[140px]" title={p.email}>{p.email}</div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {getArtistFromDream(dream)?.name ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {(() => {
                        const p = getProfileFromDream(dream);
                        return p?.last_purchased_pack_id ? (packNames[p.last_purchased_pack_id] ?? '-') : '-';
                      })()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {dream.created_at ? (() => {
                        const d = new Date(dream.created_at);
                        return isNaN(d.getTime()) ? '-' : d.toLocaleString('tr-TR');
                      })() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs ${
                          (dream.moderation_status ?? '') === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : (dream.moderation_status ?? '') === 'pending'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {dream.moderation_status || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
