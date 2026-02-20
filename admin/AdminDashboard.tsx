import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Image, Palette, TrendingUp, Calendar, Filter } from 'lucide-react';

interface Stats {
  users: number;
  dreams: number;
  artists: number;
  dreamsInPeriod: number;
}

interface RecentDream {
  id: string;
  created_at: string;
  prompt: string;
  user_id: string;
  image_url: string | null;
  moderation_status: string;
  artists: { name: string } | null;
  profiles: { email: string | null; full_name: string | null; last_purchased_pack_id: string | null } | null;
}

type DateRangeKey = '7' | '30' | '90' | 'all' | 'custom';
type ModerationFilter = 'all' | 'approved' | 'pending' | 'rejected';

const DATE_RANGE_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: '7', label: 'Son 7 gün' },
  { value: '30', label: 'Son 30 gün' },
  { value: '90', label: 'Son 90 gün' },
  { value: 'all', label: 'Tümü' },
  { value: 'custom', label: 'Özel tarih' },
];

const MODERATION_OPTIONS: { value: ModerationFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'approved', label: 'Onaylı' },
  { value: 'pending', label: 'Beklemede' },
  { value: 'rejected', label: 'Reddedilen' },
];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ users: 0, dreams: 0, artists: 0, dreamsInPeriod: 0 });
  const [recentDreams, setRecentDreams] = useState<RecentDream[]>([]);
  const [packNames, setPackNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [noBackend, setNoBackend] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeKey>('7');
  const [dateFrom, setDateFrom] = useState(toDateStr(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
  const [dateTo, setDateTo] = useState(toDateStr(new Date()));
  const [moderationFilter, setModerationFilter] = useState<ModerationFilter>('all');

  useEffect(() => {
    if (!supabase) {
      setStats({ users: 12, dreams: 48, artists: 7, dreamsInPeriod: 14 });
      setRecentDreams([]);
      setNoBackend(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    const now = new Date();
    let fromDate: string | null = null;
    let toDate: string | null = null;
    if (dateRange === 'custom') {
      fromDate = dateFrom ? new Date(dateFrom + 'T00:00:00').toISOString() : null;
      toDate = dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : null;
    } else if (dateRange !== 'all') {
      const d = new Date(now);
      d.setDate(d.getDate() - parseInt(dateRange, 10));
      fromDate = d.toISOString();
      toDate = now.toISOString();
    }

    (async () => {
      let baseDreams = supabase.from('dreams').select(`
        id, created_at, prompt, user_id, image_url, moderation_status,
        artists(name),
        profiles(email, full_name, last_purchased_pack_id)
      `, { count: 'exact' });
      if (fromDate) baseDreams = baseDreams.gte('created_at', fromDate);
      if (toDate) baseDreams = baseDreams.lte('created_at', toDate);
      const dreamsWithMod = moderationFilter !== 'all' ? baseDreams.eq('moderation_status', moderationFilter) : baseDreams;

      const [u, d, a, countInPeriod, recent, packsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('dreams').select('id', { count: 'exact', head: true }),
        supabase.from('artists').select('id', { count: 'exact', head: true }),
        dreamsWithMod.select('id', { count: 'exact', head: true }),
        baseDreams.order('created_at', { ascending: false }).limit(50),
        supabase.from('pricing_packs').select('id, name'),
      ]);

      const packs = (packsRes.data ?? []) as { id: string; name: string }[];
      setPackNames(Object.fromEntries(packs.map((p) => [p.id, p.name])));

      let recentData = (recent.data ?? []) as RecentDream[];
      if (moderationFilter !== 'all') {
        recentData = recentData.filter((x) => x.moderation_status === moderationFilter);
      }

      setStats({
        users: u.count ?? 0,
        dreams: d.count ?? 0,
        artists: a.count ?? 0,
        dreamsInPeriod: countInPeriod.count ?? 0,
      });
      setRecentDreams(recentData);
      setLoading(false);
    })();
  }, [dateRange, dateFrom, dateTo, moderationFilter]);

  const cards = [
    { label: 'Toplam Kullanıcı', value: stats.users, icon: Users, color: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-300' },
    { label: 'Toplam Rüya', value: stats.dreams, icon: Image, color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-300' },
    { label: 'Ressam Sayısı', value: stats.artists, icon: Palette, color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-300' },
    {
      label: dateRange === 'custom' ? `${dateFrom || '?'} – ${dateTo || '?'}` : dateRange === 'all' ? 'Seçili Filtre' : `Son ${dateRange} gün`,
      value: stats.dreamsInPeriod,
      icon: TrendingUp,
      color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-300',
    },
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
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tarih aralığı</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeKey)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50"
              >
                {DATE_RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {dateRange === 'custom' && (
              <>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Başlangıç</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Bitiş</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Moderasyon</label>
              <select
                value={moderationFilter}
                onChange={(e) => setModerationFilter(e.target.value as ModerationFilter)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50"
              >
                {MODERATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`rounded-xl border bg-gradient-to-br ${color} p-5`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">{label}</p>
                <p className="text-2xl font-bold mt-1">{value}</p>
              </div>
              <div className="p-2 rounded-lg bg-white/10">
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
                      <p className="text-sm text-gray-300 max-w-[200px] truncate" title={dream.prompt}>
                        {dream.prompt || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-300">
                        <span className="font-medium text-white">{dream.profiles?.full_name || dream.profiles?.email || '-'}</span>
                        {dream.profiles?.email && dream.profiles?.full_name && (
                          <div className="text-xs text-gray-500 truncate max-w-[140px]" title={dream.profiles.email}>{dream.profiles.email}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{dream.artists?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {dream.profiles?.last_purchased_pack_id ? (packNames[dream.profiles.last_purchased_pack_id] ?? '-') : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(dream.created_at).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs ${
                          dream.moderation_status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : dream.moderation_status === 'pending'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {dream.moderation_status}
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
