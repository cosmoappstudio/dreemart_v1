import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ImageIcon, Loader2, Check, Palette } from 'lucide-react';
import type { LandingExample } from '../LandingPage';

export default function AdminLanding() {
  const [list, setList] = useState<LandingExample[]>([]);
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
      .from('landing_examples')
      .select('id, dream_text, artist_name, image_url, sort_order')
      .order('sort_order')
      .then(({ data }) => {
        setList((data || []) as LandingExample[]);
        setLoading(false);
      });
  }, []);

  const update = (id: string, field: keyof LandingExample, value: string | number) => {
    setList((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const save = async (row: LandingExample) => {
    if (!supabase) return;
    setSavingId(row.id);
    await supabase
      .from('landing_examples')
      .update({
        dream_text: row.dream_text,
        artist_name: row.artist_name,
        image_url: row.image_url,
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
      .from('landing_examples')
      .insert({
        dream_text: 'Örnek rüya metni...',
        artist_name: 'Ressam Adı',
        image_url: 'https://picsum.photos/seed/new/600/400',
        sort_order: list.length,
      })
      .select()
      .single();
    if (data) setList((prev) => [...prev, data as LandingExample]);
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
        <h1 className="text-2xl font-bold text-white">Örnek Rüyalar (Landing)</h1>
        <p className="text-gray-400 text-sm mt-1">
          Ana sayfada slider yerine gösterilen 2 örnek rüya: metin, ressam adı ve çıktı görseli. Sıra numarasına göre listelenir (0, 1 = ilk iki satır).
        </p>
      </div>

      {noBackend && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-200">
          Backend bağlı değil. Supabase tablosu: landing_examples
        </div>
      )}

      <div className="space-y-4">
        {list.map((row, index) => (
          <div key={row.id} className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
              <Palette className="w-5 h-5 text-amber-400" />
              <span className="font-medium text-white">Örnek {index + 1}</span>
              <span className="text-gray-500 text-sm">(sıra: {row.sort_order})</span>
              <button
                onClick={() => save(row)}
                disabled={savingId === row.id || !supabase}
                className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
              >
                {savingId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : savedId === row.id ? <Check className="w-4 h-4" /> : null}
                {savedId === row.id ? 'Kaydedildi' : 'Kaydet'}
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Rüya metni</label>
                <textarea
                  value={row.dream_text}
                  onChange={(e) => update(row.id, 'dream_text', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm h-24 resize-y"
                  placeholder="Örnek rüya açıklaması..."
                />
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Ressam adı</label>
                <input
                  type="text"
                  value={row.artist_name}
                  onChange={(e) => update(row.id, 'artist_name', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Van Gogh"
                />
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Çıktı görseli URL</label>
                <input
                  type="url"
                  value={row.image_url}
                  onChange={(e) => update(row.id, 'image_url', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="https://..."
                />
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Sıra</label>
                <input
                  type="number"
                  min={0}
                  value={row.sort_order}
                  onChange={(e) => update(row.id, 'sort_order', parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm w-24"
                />
              </div>
              <div className="flex items-center justify-center rounded-lg bg-gray-800/50 border border-gray-700 overflow-hidden min-h-[160px]">
                {row.image_url ? (
                  <img src={row.image_url} alt="" className="max-h-48 w-auto object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <ImageIcon className="w-10 h-10" />
                    <span className="text-sm">Görsel URL girin</span>
                  </div>
                )}
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
          + Yeni örnek ekle
        </button>
      )}
    </div>
  );
}
