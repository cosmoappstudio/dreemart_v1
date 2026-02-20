import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Cpu, Loader2, Check, ExternalLink, Image as ImageIcon, MessageSquare } from 'lucide-react';

interface ReplicateRow {
  key: string;
  model_identifier: string;
  input_preset: string;
  input_extra: Record<string, unknown> | null;
  updated_at: string;
}

const ASPECT_RATIOS: { value: string; label: string }[] = [
  { value: '1:1', label: '1:1 (Kare)' },
  { value: '16:9', label: '16:9 (Yatay)' },
  { value: '9:16', label: '9:16 (Dikey)' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '21:9', label: '21:9 (Ultra geniş)' },
  { value: '9:21', label: '9:21' },
];

const PRESETS: { value: string; label: string; description: string }[] = [
  { value: 'imagen', label: 'Imagen', description: 'prompt, aspect_ratio, safety_filter_level, output_format' },
  { value: 'flux', label: 'FLUX', description: 'prompt, aspect_ratio' },
  { value: 'llm', label: 'LLM / Metin', description: 'prompt (tek giriş)' },
  { value: 'default', label: 'Varsayılan', description: 'Sadece prompt' },
];

const KEY_LABELS: Record<string, { label: string; icon: typeof ImageIcon }> = {
  image_generation: { label: 'Görsel oluşturma', icon: ImageIcon },
  interpretation: { label: 'Rüya yorumlama (metin)', icon: MessageSquare },
};

export default function AdminReplicate() {
  const [rows, setRows] = useState<ReplicateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [noBackend, setNoBackend] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setRows([]);
      setNoBackend(true);
      setLoading(false);
      return;
    }
    supabase.from('replicate_models').select('key, model_identifier, input_preset, input_extra, updated_at').in('key', ['image_generation', 'interpretation']).then(({ data, error }) => {
      const defaultRows: ReplicateRow[] = [
        { key: 'image_generation', model_identifier: 'google/imagen-4', input_preset: 'imagen', input_extra: { aspect_ratio: '1:1' }, updated_at: '' },
        { key: 'interpretation', model_identifier: 'anthropic/claude-3.5-sonnet', input_preset: 'llm', input_extra: null, updated_at: '' },
      ];
      if (error) {
        setRows(defaultRows);
      } else {
        const rows = (data ?? []) as ReplicateRow[];
        setRows(rows.length ? rows.map((r) => ({ ...r, input_extra: r.input_extra ?? (r.key === 'image_generation' ? { aspect_ratio: '1:1' } : null) })) : defaultRows);
      }
      setLoading(false);
    });
  }, []);

  const save = async (row: ReplicateRow) => {
    if (!supabase) return;
    setSavingKey(row.key);
    const { error } = await supabase.from('replicate_models').upsert({
      key: row.key,
      model_identifier: row.model_identifier.trim(),
      input_preset: row.input_preset,
      input_extra: row.input_extra && Object.keys(row.input_extra).length > 0 ? row.input_extra : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });
    setSavingKey(null);
    if (!error) {
      setRows((prev) => prev.map((p) => (p.key === row.key ? { ...row, updated_at: new Date().toISOString() } : p)));
      setSavedKey(row.key);
      setTimeout(() => setSavedKey(null), 2000);
    }
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
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">Replicate modelleri</h1>
        <p className="text-gray-400 text-sm">
          Görsel ve yorumlama için kullanılan Replicate modellerini buradan güncelleyebilirsiniz. Model adı <code className="text-gray-300 bg-gray-800 px-1 rounded">owner/name</code> veya <code className="text-gray-300 bg-gray-800 px-1 rounded">owner/name:version</code> formatında olmalı.
        </p>
        <a
          href="https://replicate.com/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 mt-1"
        >
          Replicate Docs <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {noBackend && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-200">
          Backend bağlı değil. Replicate ayarları yüklenemiyor.
        </div>
      )}

      <div className="space-y-6">
        {rows.map((row) => {
          const meta = KEY_LABELS[row.key] ?? { label: row.key, icon: Cpu };
          const Icon = meta.icon;
          return (
            <div key={row.key} className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-gray-800">
                  <Icon className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">{meta.label}</h2>
                  <p className="text-xs text-gray-500">Key: {row.key}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Model (owner/name veya owner/name:version)</label>
                  <input
                    value={row.model_identifier}
                    onChange={(e) => setRows((prev) => prev.map((p) => (p.key === row.key ? { ...p, model_identifier: e.target.value } : p)))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
                    placeholder="google/imagen-4"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Giriş preset’i</label>
                  <select
                    value={row.input_preset}
                    onChange={(e) => setRows((prev) => prev.map((p) => (p.key === row.key ? { ...p, input_preset: e.target.value } : p)))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    {PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">{PRESETS.find((p) => p.value === row.input_preset)?.description}</p>
                </div>
                {row.key === 'image_generation' && row.input_preset === 'imagen' && (
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Imagen-4 çıktı boyutu (aspect_ratio)</label>
                    <select
                      value={(row.input_extra?.aspect_ratio as string) ?? '1:1'}
                      onChange={(e) => setRows((prev) => prev.map((p) => (p.key === row.key ? { ...p, input_extra: { ...(p.input_extra ?? {}), aspect_ratio: e.target.value } } : p)))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm max-w-xs"
                    >
                      {ASPECT_RATIOS.map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => save(row)}
                  disabled={savingKey === row.key || !supabase}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
                >
                  {savingKey === row.key ? <Loader2 className="w-4 h-4 animate-spin" /> : savedKey === row.key ? <Check className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
                  {savedKey === row.key ? 'Kaydedildi' : 'Kaydet'}
                </button>
                <a
                  href={`https://replicate.com/explore?query=${encodeURIComponent(row.model_identifier)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Replicate’te ara
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
