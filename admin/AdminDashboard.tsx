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
  moderation_status: string;
}

type DateRangeKey = '7' | '30' | '90' | 'all';
type ModerationFilter = 'all' | 'approved' | 'pending' | 'rejected';

const DATE_RANGE_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: '7', label: 'Son 7 gün' },
  { value: '30', label: 'Son 30 gün' },
  { value: '90', label: 'Son 90 gün' },
  { value: 'all', label: 'Tümü' },
];

const MODERATION_OPTIONS: { value: ModerationFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'approved', label: 'Onaylı' },
  { value: 'pending', label: 'Beklemede' },
  { value: 'rejected', label: 'Reddedilen' },
];

function getDateFromRange(key: DateRangeKey): string | null {
  if (key === 'all') return null;
  const d = new Date();
  d.setDate(d.getDate() - parseInt(key, 10));
  return d.toISOString();
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ users: 0, dreams: 0, artists: 0, dreamsInPeriod: 0 });
  const [recentDreams, setRecentDreams] = useState<RecentDream[]>([]);
  const [loading, setLoading] = useState(true);
  const [noBackend, setNoBackend] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeKey>('7');
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
    const fromDate = getDateFromRange(dateRange);
    (async () => {
      const baseDreams = supabase.from('dreams').select('id, created_at, prompt, user_id, moderation_status', { count: 'exact' });
      const dreamsWithDate = fromDate ? baseDreams.gte('created_at', fromDate) : baseDreams;
      const dreamsWithMod = moderationFilter !== 'all' ? dreamsWithDate.eq('moderation_status', moderationFilter) : dreamsWithDate;

      const [u, d, a, countInPeriod, recent] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('dreams').select('id', { count: 'exact', head: true }),
        supabase.from('artists').select('id', { count: 'exact', head: true }),
        dreamsWithMod.select('id', { count: 'exact', head: true }),
        dreamsWithDate.order('created_at', { ascending: false }).limit(20),
      ]);

      let recentData = (recent.data as RecentDream[]) ?? [];
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
  }, [dateRange, moderationFilter]);

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

  const cards = [
    { label: 'Toplam Kullanıcı', value: stats.users, icon: Users, color: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-300' },
    { label: 'Toplam Rüya', value: stats.dreams, icon: Image, color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-300' },
    { label: 'Ressam Sayısı', value: stats.artists, icon: Palette, color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-300' },
    { label: dateRange === 'all' ? 'Seçili Filtre' : `Son ${dateRange} gün`, value: stats.dreamsInPeriod, icon: TrendingUp, color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-300' },
  ];

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
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tarih aralığı</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeKey)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
              >
                {DATE_RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Moderasyon durumu</label>
              <select
                value={moderationFilter}
                onChange={(e) => setModerationFilter(e.target.value as ModerationFilter)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
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

      {/* Son rüyalar */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-white">Son Üretilen Rüyalar</h2>
            {moderationFilter !== 'all' && (
              <span className="text-xs text-gray-500">({moderationFilter})</span>
            )}
          </div>
        </div>
        <div className="divide-y divide-gray-800">
          {recentDreams.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">Filtreye uygun rüya kaydı yok.</div>
          ) : (
            recentDreams.map((dream) => (
              <div key={dream.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-800/30">
                <span className="text-xs text-gray-500 w-32 flex-shrink-0">
                  {new Date(dream.created_at).toLocaleString('tr-TR')}
                </span>
                <p className="flex-1 min-w-0 text-sm text-gray-300 truncate" title={dream.prompt}>
                  {dream.prompt || '-'}
                </p>
                <span className="text-xs text-gray-500 font-mono truncate max-w-24">{dream.user_id?.slice(0, 8)}…</span>
                <span className={`text-xs px-2 py-0.5 rounded ${dream.moderation_status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : dream.moderation_status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                  {dream.moderation_status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
