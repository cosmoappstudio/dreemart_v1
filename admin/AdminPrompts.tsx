import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, ChevronDown, ChevronRight, Loader2, Check } from 'lucide-react';

interface PromptRow {
  id: string;
  key: string;
  content: string;
}

const PLACEHOLDERS = ['{{artistName}}', '{{styleDescription}}', '{{dreamText}}', '{{language}}'];

export default function AdminPrompts() {
  const [list, setList] = useState<PromptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [noBackend, setNoBackend] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setList([]);
      setNoBackend(true);
      setLoading(false);
      return;
    }
    supabase.from('prompt_templates').select('*').then(({ data }) => {
      setList(data || []);
      setLoading(false);
      if (data?.length) setExpandedId(data[0].id);
    });
  }, []);

  const save = async (row: PromptRow) => {
    if (!supabase) return;
    setSavingId(row.id);
    await supabase.from('prompt_templates').update({
      content: row.content,
      updated_at: new Date().toISOString(),
    }).eq('id', row.id);
    setSavingId(null);
    setSavedId(row.id);
    setTimeout(() => setSavedId(null), 2000);
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
        <h1 className="text-2xl font-bold text-white">Prompt Şablonları</h1>
        <p className="text-gray-400 text-sm mt-1">API tarafında kullanılan metinler. Değişkenler aşağıda listeleniyor.</p>
      </div>

      {noBackend && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-200">
          Backend bağlı değil. Prompt listesi yüklenemiyor.
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {PLACEHOLDERS.map((ph) => (
          <code key={ph} className="px-2 py-1 rounded bg-gray-800 text-gray-400 text-xs font-mono border border-gray-700">
            {ph}
          </code>
        ))}
      </div>

      <div className="space-y-2">
        {list.map((row) => {
          const isExpanded = expandedId === row.id;
          return (
            <div key={row.id} className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : row.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800/30 transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span className="font-mono text-sm text-white">{row.key}</span>
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-800">
                  <textarea
                    value={row.content}
                    onChange={(e) => setList((prev) => prev.map((p) => (p.id === row.id ? { ...p, content: e.target.value } : p)))}
                    className="w-full mt-3 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono h-40 resize-y focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                    placeholder="Prompt metni..."
                  />
                  <button
                    onClick={() => save(row)}
                    disabled={savingId === row.id || !supabase}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {savingId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : savedId === row.id ? <Check className="w-4 h-4" /> : null}
                    {savedId === row.id ? 'Kaydedildi' : 'Kaydet'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {list.length === 0 && !noBackend && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-12 text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Henüz prompt şablonu yok.</p>
        </div>
      )}
    </div>
  );
}
