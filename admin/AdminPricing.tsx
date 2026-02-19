import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Check, CreditCard } from 'lucide-react';
import type { PricingPack } from '../LandingPage';

export default function AdminPricing() {
  const [list, setList] = useState<PricingPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [noBackend, setNoBackend] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setNoBackend(true);
      setLoading(false);
      return;
    }
    supabase
      .from('pricing_packs')
      .select('id, name, price, per, credits_text, credits_amount, paddle_product_id, four_k, badge, sort_order')
      .order('sort_order')
      .then(({ data }) => {
        setList((data || []) as PricingPack[]);
        setLoading(false);
      });
  }, []);

  const update = (id: string, field: keyof PricingPack, value: string | number | boolean | null) => {
    setList((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const save = async (row: PricingPack) => {
    if (!supabase) return;
    setSavingId(row.id);
    await supabase
      .from('pricing_packs')
      .update({
        name: row.name,
        price: row.price,
        per: row.per,
        credits_text: row.credits_text,
        credits_amount: row.credits_amount ?? 0,
        paddle_product_id: row.paddle_product_id?.trim() || null,
        four_k: row.four_k,
        badge: row.badge || null,
        sort_order: row.sort_order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    setSavingId(null);
    setSavedId(row.id);
    setTimeout(() => setSavedId(null), 2000);
  };

  const addNew = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('pricing_packs')
      .insert({
        name: 'YENİ',
        price: '₺0',
        per: '/ 0 Kredi',
        credits_text: '0 Kredi',
        credits_amount: 0,
        paddle_product_id: null,
        four_k: false,
        badge: null,
        sort_order: list.length,
      })
      .select()
      .single();
    if (data) setList((prev) => [...prev, data as PricingPack]);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
        <p className="text-gray-400 text-sm">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Kredi Paketleri</h1>
        <p className="text-gray-400 text-sm mt-1">
          Kredi paketleri: name, price, per, credits_text (gösterim), credits_amount (sayı – Paddle webhook bunu kullanır), paddle_product_id (Paddle ürün ID). four_k ve badge opsiyonel.
        </p>
      </div>

      {noBackend && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-200">
          Backend bağlı değil. Supabase tablosu: pricing_packs
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((row) => (
          <div key={row.id} className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <span className="font-medium text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-400" />
                {row.name}
              </span>
              <button
                onClick={() => save(row)}
                disabled={savingId === row.id || !supabase}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
              >
                {savingId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : savedId === row.id ? <Check className="w-4 h-4" /> : null}
                {savedId === row.id ? 'Kaydedildi' : 'Kaydet'}
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Paket adı</label>
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => update(row.id, 'name', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fiyat</label>
                  <input
                    type="text"
                    value={row.price}
                    onChange={(e) => update(row.id, 'price', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="₺99"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Per (örn. / 5 Kredi)</label>
                <input
                  type="text"
                  value={row.per}
                  onChange={(e) => update(row.id, 'per', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Kredi metni (gösterim, örn. 5 Kredi)</label>
                  <input
                    type="text"
                    value={row.credits_text}
                    onChange={(e) => update(row.id, 'credits_text', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Kredi miktarı (sayı) – webhook bu değeri kullanır</label>
                  <input
                    type="number"
                    min={0}
                    value={row.credits_amount ?? 0}
                    onChange={(e) => update(row.id, 'credits_amount', parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Paddle ürün ID (Paddle’daki product_id; boş bırakılırsa paket id ile eşleşir)</label>
                <input
                  type="text"
                  value={row.paddle_product_id ?? ''}
                  onChange={(e) => update(row.id, 'paddle_product_id', e.target.value.trim() || null)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
                  placeholder="pri_xxx veya boş"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={row.four_k}
                    onChange={(e) => update(row.id, 'four_k', e.target.checked)}
                    className="rounded border-gray-600 bg-gray-800 text-indigo-500"
                  />
                  <span className="text-sm text-gray-300">4K</span>
                </label>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Badge (boş = yok, örn. Popüler)</label>
                  <input
                    type="text"
                    value={row.badge || ''}
                    onChange={(e) => update(row.id, 'badge', e.target.value.trim() || null)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="Popüler"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Sıra</label>
                <input
                  type="number"
                  min={0}
                  value={row.sort_order}
                  onChange={(e) => update(row.id, 'sort_order', parseInt(e.target.value, 10) || 0)}
                  className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {supabase && (
        <button
          type="button"
          onClick={addNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500"
        >
          + Yeni paket ekle
        </button>
      )}
    </div>
  );
}
