import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Loader2, Check } from 'lucide-react';
import type { Language } from '../types';

const PAGES: { key: string; label: string }[] = [
  { key: 'terms', label: 'Kullanım Koşulları' },
  { key: 'privacy', label: 'Gizlilik Politikası' },
  { key: 'refund_policy', label: 'İade Politikası' },
  { key: 'cookie_policy', label: 'Çerez Politikası' },
];

const LANGS: { code: Language; label: string }[] = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
];

interface Row {
  key: string;
  language: Language;
  title: string;
  content: string;
}

export default function AdminLegal() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [noBackend, setNoBackend] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setNoBackend(true);
      setLoading(false);
      return;
    }
    supabase
      .from('legal_pages')
      .select('key, language, title, content')
      .then(({ data }) => {
        setRows((data || []) as Row[]);
        setLoading(false);
      });
  }, []);

  const getRow = (key: string, lang: Language) => rows.find((r) => r.key === key && r.language === lang);
  const setRow = (key: string, lang: Language, field: 'title' | 'content', value: string) => {
    setRows((prev) => {
      const rest = prev.filter((r) => !(r.key === key && r.language === lang));
      const existing = prev.find((r) => r.key === key && r.language === lang);
      const next = { ...(existing || { key, language: lang, title: '', content: '' }), [field]: value };
      return [...rest, next];
    });
  };

  const save = async (key: string, lang: Language) => {
    if (!supabase) return;
    const row = getRow(key, lang);
    if (!row) return;
    setSaving(`${key}-${lang}`);
    await supabase.from('legal_pages').upsert(
      { key: row.key, language: row.language, title: row.title, content: row.content, updated_at: new Date().toISOString() },
      { onConflict: 'key,language' }
    );
    setSaving(null);
    setSaved(`${key}-${lang}`);
    setTimeout(() => setSaved(null), 2000);
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
        <h1 className="text-2xl font-bold text-white">Yasal Sayfalar</h1>
        <p className="text-gray-400 text-sm mt-1">Terms, Privacy ve Refund Policy içeriklerini dil bazlı düzenleyin (HTML kullanılabilir)</p>
      </div>

      {noBackend && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-200">
          Backend bağlı değil.
        </div>
      )}

      <div className="space-y-8">
        {PAGES.map(({ key, label }) => (
          <div key={key} className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              <h2 className="font-semibold text-white">{label}</h2>
            </div>
            <div className="p-5 space-y-6">
              {LANGS.map(({ code, label: langLabel }) => {
                const row = getRow(key, code) || { key, language: code, title: '', content: '' };
                const id = `${key}-${code}`;
                return (
                  <div key={id} className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-300">{langLabel}</span>
                      <button
                        onClick={() => save(key, code)}
                        disabled={saving === id || !supabase}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {saving === id ? <Loader2 className="w-4 h-4 animate-spin" /> : saved === id ? <Check className="w-4 h-4" /> : null}
                        {saved === id ? 'Kaydedildi' : 'Kaydet'}
                      </button>
                    </div>
                    <div className="space-y-2">
                      <input
                        value={row.title}
                        onChange={(e) => setRow(key, code, 'title', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                        placeholder="Sayfa başlığı"
                      />
                      <textarea
                        value={row.content}
                        onChange={(e) => setRow(key, code, 'content', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono h-40 resize-y"
                        placeholder="HTML içerik (örn. <h2>Başlık</h2><p>Paragraf...</p>)"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
