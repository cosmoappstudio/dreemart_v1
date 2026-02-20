import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, TrendingUp, DollarSign, Package, Globe, Calendar, Filter, Mail, Banknote, X } from 'lucide-react';
import { DateRangePicker, defaultDateRangeValue, getDateRangeISO, type DateRangeValue } from './DateRangePicker';

interface SaleRow {
  id: string;
  transaction_id: string;
  created_at: string;
  user_id: string | null;
  pack_id: string | null;
  pack_name: string | null;
  credits_amount: number;
  amount: string | null;
  currency_code: string;
  country_code: string | null;
  customer_email: string | null;
  profiles?: { email: string | null; full_name: string | null } | null;
}

const LIMIT_OPTIONS = [50, 100, 200, 500, 1000] as const;

/** Lemon Squeezy / Paddle amounts are in smallest currency unit (cents for USD). Convert to display value. */
function parseAmount(amount: string | null, currency: string): number {
  if (!amount) return 0;
  const n = parseFloat(String(amount).replace(/[^0-9.-]/g, ''));
  if (isNaN(n)) return 0;
  const zeroDecimal = ['JPY', 'KRW', 'VND', 'CLP', 'COP', 'IDR'].includes(currency?.toUpperCase?.());
  return zeroDecimal ? n : n / 100;
}

function formatAmount(value: number, currency: string): string {
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'TRY' ? '₺' : '$';
  const zeroDecimal = ['JPY', 'KRW', 'VND', 'CLP', 'COP', 'IDR'].includes(currency?.toUpperCase?.());
  return `${sym}${value.toFixed(zeroDecimal ? 0 : 2)}`;
}

export default function AdminSales() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [filterOptions, setFilterOptions] = useState<{ packs: string[]; countries: string[]; currencies: string[] }>({ packs: [], countries: [], currencies: [] });
  const [loading, setLoading] = useState(true);
  const [noBackend, setNoBackend] = useState(false);
  const [dateRangeValue, setDateRangeValue] = useState<DateRangeValue>(() => defaultDateRangeValue(true));
  const [compareStats, setCompareStats] = useState<{ revenue: number; count: number }>({ revenue: 0, count: 0 });
  const [filterPack, setFilterPack] = useState<string>('');
  const [filterCountry, setFilterCountry] = useState<string>('');
  const [filterCurrency, setFilterCurrency] = useState<string>('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [limit, setLimit] = useState(200);

  const { from: fromDate, to: toDate, compareFrom, compareTo } = getDateRangeISO(dateRangeValue);

  useEffect(() => {
    if (!supabase) {
      setNoBackend(true);
      setLoading(false);
      return;
    }
    setLoading(true);

    let q = supabase
      .from('lemon_squeezy_sales')
      .select(`
        id, transaction_id, created_at, user_id, pack_id, pack_name,
        credits_amount, amount, currency_code, country_code, customer_email,
        profiles(email, full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (fromDate) q = q.gte('created_at', fromDate);
    if (toDate) q = q.lte('created_at', toDate);
    if (filterPack) q = q.eq('pack_name', filterPack);
    if (filterCountry) q = q.eq('country_code', filterCountry);
    if (filterCurrency) q = q.eq('currency_code', filterCurrency);
    if (filterCustomer.trim()) {
      q = q.ilike('customer_email', `%${filterCustomer.trim()}%`);
    }

    const comparePromise = dateRangeValue.compareEnabled && compareFrom && compareTo
      ? supabase.from('lemon_squeezy_sales').select('id, amount, currency_code').gte('created_at', compareFrom).lte('created_at', compareTo)
      : Promise.resolve({ data: [] as SaleRow[] });

    Promise.all([q, comparePromise]).then(([salesRes, compareRes]) => {
      if (salesRes.error) {
        setSales([]);
      } else {
        setSales((salesRes.data ?? []) as unknown as SaleRow[]);
      }
      const compareRows = (compareRes.data ?? []) as { amount: string | null; currency_code: string }[];
      setCompareStats({
        revenue: compareRows.reduce((s, x) => s + parseAmount(x.amount, x.currency_code), 0),
        count: compareRows.length,
      });
      setLoading(false);
    });
  }, [fromDate, toDate, compareFrom, compareTo, dateRangeValue.compareEnabled, filterPack, filterCountry, filterCurrency, filterCustomer, limit]);

  useEffect(() => {
    if (!supabase) return;
    let q = supabase.from('lemon_squeezy_sales').select('pack_name, country_code, currency_code').limit(2000);
    if (fromDate) q = q.gte('created_at', fromDate);
    if (toDate) q = q.lte('created_at', toDate);
    q.then(({ data }) => {
      const packs = new Set<string>();
      const countries = new Set<string>();
      const currencies = new Set<string>();
      (data ?? []).forEach((r: { pack_name?: string; country_code?: string; currency_code?: string }) => {
        if (r.pack_name) packs.add(r.pack_name);
        if (r.country_code) countries.add(r.country_code);
        if (r.currency_code) currencies.add(r.currency_code);
      });
      setFilterOptions({
        packs: Array.from(packs).sort(),
        countries: Array.from(countries).sort(),
        currencies: Array.from(currencies).sort(),
      });
    });
  }, [fromDate, toDate]);

  const clearFilters = () => {
    setFilterPack('');
    setFilterCountry('');
    setFilterCurrency('');
    setFilterCustomer('');
  };

  const hasActiveFilters = filterPack || filterCountry || filterCurrency || filterCustomer.trim();

  const totalRevenue = sales.reduce((sum, s) => sum + parseAmount(s.amount, s.currency_code), 0);
  const totalSales = sales.length;
  const byPack = sales.reduce<Record<string, { count: number; revenue: number }>>((acc, s) => {
    const name = s.pack_name || 'Bilinmeyen';
    if (!acc[name]) acc[name] = { count: 0, revenue: 0 };
    acc[name].count++;
    acc[name].revenue += parseAmount(s.amount, s.currency_code);
    return acc;
  }, {});
  const byCountry = sales.reduce<Record<string, { count: number; revenue: number }>>((acc, s) => {
    const code = s.country_code || '?';
    if (!acc[code]) acc[code] = { count: 0, revenue: 0 };
    acc[code].count++;
    acc[code].revenue += parseAmount(s.amount, s.currency_code);
    return acc;
  }, {});

  const currency = sales[0]?.currency_code ?? 'USD';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
        <p className="text-gray-400 text-sm">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Satış & Gelir</h1>
        <p className="text-gray-400 text-sm mt-1">
          Lemon Squeezy webhook ile gelen satışlar. Webhook URL: <code className="text-xs bg-gray-800 px-1 rounded">https://dreemart.app/api/lemon-squeezy-webhook</code>
        </p>
      </div>

      {noBackend && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-200">
          Backend bağlı değil. lemon_squeezy_sales tablosu için 021 migration'ı çalıştırın.
        </div>
      )}

      {/* Filtreler */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2 text-gray-300 text-sm font-medium">
            <Filter className="w-4 h-4" />
            Filtreler
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Filtreleri temizle
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div className="relative">
            <label className="block text-xs text-gray-500 mb-1">Tarih aralığı</label>
            <DateRangePicker
              value={dateRangeValue}
              onChange={setDateRangeValue}
              triggerLabel={`${dateRangeValue.presetLabel} ${dateRangeValue.from ? new Date(dateRangeValue.from + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : ''} – ${dateRangeValue.to ? new Date(dateRangeValue.to + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}`}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1"><Package className="w-3 h-3" /> Paket</label>
            <select
              value={filterPack}
              onChange={(e) => setFilterPack(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">Tüm paketler</option>
              {filterOptions.packs.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1"><Globe className="w-3 h-3" /> Ülke</label>
            <select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">Tüm ülkeler</option>
              {filterOptions.countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1"><Banknote className="w-3 h-3" /> Para birimi</label>
            <select
              value={filterCurrency}
              onChange={(e) => setFilterCurrency(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">Tüm para birimleri</option>
              {filterOptions.currencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Müşteri (e-posta)</label>
            <input
              type="text"
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              placeholder="Ara..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Maks. kayıt</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 p-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-emerald-300/90">Toplam Gelir</p>
              <p className="text-2xl font-bold text-white mt-1">{formatAmount(totalRevenue, currency)}</p>
              {dateRangeValue.compareEnabled && (
                <>
                  <p className="text-xs text-gray-400 mt-0.5">{formatAmount(compareStats.revenue, currency)} önceki dönem</p>
                  <p className={`text-xs font-medium mt-0.5 ${totalRevenue >= compareStats.revenue ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {compareStats.revenue ? `${((totalRevenue - compareStats.revenue) / compareStats.revenue * 100).toFixed(0)}%` : totalRevenue ? '+100%' : '0%'}
                  </p>
                </>
              )}
            </div>
            <DollarSign className="w-8 h-8 text-emerald-400/60 flex-shrink-0" />
          </div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30 p-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-300/90">Satış Sayısı</p>
              <p className="text-2xl font-bold text-white mt-1">{totalSales}</p>
              {dateRangeValue.compareEnabled && (
                <>
                  <p className="text-xs text-gray-400 mt-0.5">{compareStats.count} önceki dönem</p>
                  <p className={`text-xs font-medium mt-0.5 ${totalSales >= compareStats.count ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {compareStats.count ? `${((totalSales - compareStats.count) / compareStats.count * 100).toFixed(0)}%` : totalSales ? '+100%' : '0%'}
                  </p>
                </>
              )}
            </div>
            <TrendingUp className="w-8 h-8 text-amber-400/60 flex-shrink-0" />
          </div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-300/90">Paket Çeşidi</p>
              <p className="text-2xl font-bold text-white mt-1">{Object.keys(byPack).length}</p>
            </div>
            <Package className="w-8 h-8 text-indigo-400/60" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pakete göre */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold text-white">Pakete Göre</h2>
          </div>
          <div className="p-4">
            {Object.entries(byPack).length === 0 ? (
              <p className="text-gray-500 text-sm">Satış yok</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-left border-b border-gray-800">
                    <th className="pb-2 font-medium">Paket</th>
                    <th className="pb-2 font-medium text-right">Adet</th>
                    <th className="pb-2 font-medium text-right">Gelir</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.entries(byPack) as [string, { count: number; revenue: number }][]).map(([name, { count, revenue }]) => (
                    <tr key={name} className="border-b border-gray-800/50">
                      <td className="py-2 text-white">{name}</td>
                      <td className="py-2 text-right text-gray-300">{count}</td>
                      <td className="py-2 text-right text-emerald-400">{formatAmount(revenue, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Ülkeye göre */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold text-white">Ülkeye Göre</h2>
          </div>
          <div className="p-4">
            {Object.entries(byCountry).length === 0 ? (
              <p className="text-gray-500 text-sm">Satış yok</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-left border-b border-gray-800">
                    <th className="pb-2 font-medium">Ülke</th>
                    <th className="pb-2 font-medium text-right">Adet</th>
                    <th className="pb-2 font-medium text-right">Gelir</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.entries(byCountry) as [string, { count: number; revenue: number }][])
                    .sort((a, b) => b[1].revenue - a[1].revenue)
                    .map(([code, { count, revenue }]) => (
                      <tr key={code} className="border-b border-gray-800/50">
                        <td className="py-2 text-white">{code === '?' ? 'Belirtilmemiş' : code}</td>
                        <td className="py-2 text-right text-gray-300">{count}</td>
                        <td className="py-2 text-right text-emerald-400">{formatAmount(revenue, currency)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Son satışlar detay */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-400" />
          <h2 className="font-semibold text-white">Son Satışlar</h2>
        </div>
        <div className="overflow-x-auto">
          {sales.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">Filtreye uygun satış yok.</div>
          ) : (
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase">
                  <th className="px-4 py-3 font-medium">Tarih</th>
                  <th className="px-4 py-3 font-medium">İşlem</th>
                  <th className="px-4 py-3 font-medium">Paket</th>
                  <th className="px-4 py-3 font-medium">Müşteri</th>
                  <th className="px-4 py-3 font-medium">Ülke</th>
                  <th className="px-4 py-3 font-medium text-right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(s.created_at).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500 truncate max-w-[120px]" title={s.transaction_id}>
                      {s.transaction_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {s.pack_name || '-'} {s.credits_amount > 0 && <span className="text-gray-500">({s.credits_amount} kr)</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300 truncate max-w-[160px]">
                      {s.profiles?.email ?? s.customer_email ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{s.country_code || '-'}</td>
                    <td className="px-4 py-3 text-sm text-emerald-400 text-right font-medium">
                      {s.amount ? formatAmount(parseAmount(s.amount, s.currency_code), s.currency_code) : '-'}
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
