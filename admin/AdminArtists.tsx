import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Palette, Plus, Loader2, Check, Image as ImageIcon, EyeOff, Trash2, Upload } from 'lucide-react';

interface ArtistRow {
  id: string;
  slug: string;
  name: string;
  style_description: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
}

export default function AdminArtists() {
  const [list, setList] = useState<ArtistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [noBackend, setNoBackend] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!supabase) {
      setList([]);
      setNoBackend(true);
      setLoading(false);
      return;
    }
    supabase.from('artists').select('*').order('sort_order').then(({ data }) => {
      setList(data || []);
      setLoading(false);
    });
  }, []);

  const save = async (row: ArtistRow) => {
    if (!supabase) return;
    setSavingId(row.id);
    await supabase.from('artists').update({
      name: row.name,
      slug: row.slug,
      style_description: row.style_description,
      image_url: row.image_url,
      is_active: row.is_active,
      sort_order: row.sort_order,
      updated_at: new Date().toISOString(),
    }).eq('id', row.id);
    setList((prev) => prev.map((p) => (p.id === row.id ? row : p)));
    setSavingId(null);
    setSavedId(row.id);
    setTimeout(() => setSavedId(null), 2000);
  };

  const addNew = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('artists')
      .insert({
        slug: 'yeni-ressam',
        name: 'Yeni Ressam',
        style_description: 'Style description for prompt',
        image_url: 'https://picsum.photos/100/100',
        is_active: false,
        sort_order: list.length,
      })
      .select()
      .single();
    if (data) setList((prev) => [...prev, data as ArtistRow]);
  };

  const removeFromList = async (row: ArtistRow) => {
    if (!supabase) return;
    setSavingId(row.id);
    setDeleteError(null);
    const updated = { ...row, is_active: false };
    await supabase.from('artists').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', row.id);
    setList((prev) => prev.map((p) => (p.id === row.id ? updated : p)));
    setSavingId(null);
    setSavedId(row.id);
    setTimeout(() => setSavedId(null), 2000);
  };

  const deleteArtist = async (row: ArtistRow) => {
    if (!supabase) return;
    setDeleteError(null);
    const { count } = await supabase.from('dreams').select('id', { count: 'exact', head: true }).eq('artist_id', row.id);
    if (count && count > 0) {
      setDeleteError(`Bu ressamı kullanan ${count} rüya var. Önce "Listeden kaldır" ile pasif yapın.`);
      return;
    }
    if (!window.confirm(`"${row.name}" ressamını kalıcı olarak silmek istediğinize emin misiniz?`)) return;
    setDeletingId(row.id);
    const { error } = await supabase.from('artists').delete().eq('id', row.id);
    setDeletingId(null);
    if (error) {
      setDeleteError(error.code === '23503' ? 'Bu ressamı kullanan rüyalar var; önce listeden kaldırın.' : error.message);
      return;
    }
    setList((prev) => prev.filter((p) => p.id !== row.id));
  };

  const uploadImage = async (row: ArtistRow, file: File) => {
    if (!supabase) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setUploadError('Sadece JPG, PNG, WebP veya GIF yükleyebilirsiniz.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Dosya 2 MB\'dan küçük olmalı.');
      return;
    }
    setUploadError(null);
    setUploadingId(row.id);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${row.id}.${ext}`;
    const { error } = await supabase.storage.from('artist-avatars').upload(path, file, { upsert: true });
    if (error) {
      setUploadError(error.message === 'Bucket not found' ? 'Storage bucket "artist-avatars" yok. Supabase Dashboard\'dan oluşturun.' : error.message);
      setUploadingId(null);
      return;
    }
    const { data: urlData } = supabase.storage.from('artist-avatars').getPublicUrl(path);
    const newUrl = urlData?.publicUrl ?? '';
    setList((prev) => prev.map((p) => (p.id === row.id ? { ...p, image_url: newUrl } : p)));
    await supabase.from('artists').update({ image_url: newUrl, updated_at: new Date().toISOString() }).eq('id', row.id);
    setUploadingId(null);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Ressamlar</h1>
          <p className="text-gray-400 text-sm mt-1">Tarzlara göre ressam listesi, görsel (kullanıcıya gösterilen avatar), prompt ve sıra</p>
        </div>
        {supabase && (
          <button
            onClick={addNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Yeni Ressam
          </button>
        )}
      </div>

      {noBackend && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-200">
          Backend bağlı değil. Ressam listesi yüklenemiyor.
        </div>
      )}

      {deleteError && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-200 flex items-center justify-between gap-3">
          <span>{deleteError}</span>
          <button type="button" onClick={() => setDeleteError(null)} className="text-red-300 hover:text-white shrink-0">Kapat</button>
        </div>
      )}
      {uploadError && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-200 flex items-center justify-between gap-3">
          <span>{uploadError}</span>
          <button type="button" onClick={() => setUploadError(null)} className="text-amber-300 hover:text-white shrink-0">Kapat</button>
        </div>
      )}

      <div className="space-y-4">
        {list.map((row) => (
          <div key={row.id} className={`rounded-xl border overflow-hidden ${row.is_active ? 'border-gray-800 bg-gray-900/50' : 'border-gray-700 bg-gray-900/30'}`}>
            <div className="p-4 flex flex-col md:flex-row gap-4">
              {/* Ressam görseli: kullanıcının gördüğü avatar */}
              <div className="flex-shrink-0 flex flex-col items-start gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Ressam görseli</span>
                  <span className="text-xs text-gray-500">(kullanıcı ressam seçerken bunu görür)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-800 border-2 border-gray-700 flex items-center justify-center ring-2 ring-transparent">
                    {row.image_url ? (
                      <img src={row.image_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-600" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      ref={(el) => { fileInputRefs.current[row.id] = el; }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadImage(row, f);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[row.id]?.click()}
                      disabled={uploadingId === row.id || !supabase}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 text-gray-300 text-sm font-medium hover:bg-gray-600 disabled:opacity-50"
                    >
                      {uploadingId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Dosya yükle
                    </button>
                    <span className="text-xs text-gray-500">JPG, PNG, WebP, GIF · max 2 MB</span>
                  </div>
                </div>
                <div className="w-full max-w-xs">
                  <label className="block text-xs text-gray-500 mb-1">Veya görsel URL</label>
                  <input
                    value={row.image_url}
                    onChange={(e) => setList((prev) => prev.map((p) => (p.id === row.id ? { ...p, image_url: e.target.value } : p)))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="https://..."
                  />
                </div>
                <div className="md:hidden flex flex-col gap-2">
                  <label className="text-xs text-gray-500">Sıra</label>
                  <input
                    type="number"
                    value={row.sort_order}
                    onChange={(e) => setList((prev) => prev.map((p) => (p.id === row.id ? { ...p, sort_order: parseInt(e.target.value, 10) || 0 } : p)))}
                    className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={row.is_active}
                      onChange={(e) => setList((prev) => prev.map((p) => (p.id === row.id ? { ...p, is_active: e.target.checked } : p)))}
                      className="rounded border-gray-600"
                    />
                    Aktif
                  </label>
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Slug</label>
                    <input
                      value={row.slug}
                      onChange={(e) => setList((prev) => prev.map((p) => (p.id === row.id ? { ...p, slug: e.target.value } : p)))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
                      placeholder="van-gogh"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Ad</label>
                    <input
                      value={row.name}
                      onChange={(e) => setList((prev) => prev.map((p) => (p.id === row.id ? { ...p, name: e.target.value } : p)))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                      placeholder="Van Gogh"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Style (prompt)</label>
                  <textarea
                    value={row.style_description}
                    onChange={(e) => setList((prev) => prev.map((p) => (p.id === row.id ? { ...p, style_description: e.target.value } : p)))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm h-20 resize-y"
                    placeholder="oil painting, thick impasto..."
                  />
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="hidden md:flex items-end gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Sıra</label>
                      <input
                        type="number"
                        value={row.sort_order}
                        onChange={(e) => setList((prev) => prev.map((p) => (p.id === row.id ? { ...p, sort_order: parseInt(e.target.value, 10) || 0 } : p)))}
                        className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-300 pb-1.5">
                      <input
                        type="checkbox"
                        checked={row.is_active}
                        onChange={(e) => setList((prev) => prev.map((p) => (p.id === row.id ? { ...p, is_active: e.target.checked } : p)))}
                        className="rounded border-gray-600"
                      />
                      Aktif
                    </label>
                  </div>
                  {!row.is_active && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium">Pasif</span>
                  )}
                  <button
                    onClick={() => save(row)}
                    disabled={savingId === row.id || !supabase}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {savingId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : savedId === row.id ? <Check className="w-4 h-4" /> : <Palette className="w-4 h-4" />}
                    {savedId === row.id ? 'Kaydedildi' : 'Kaydet'}
                  </button>
                  {row.is_active && (
                    <button
                      type="button"
                      onClick={() => removeFromList(row)}
                      disabled={savingId === row.id || !supabase}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 text-gray-300 text-sm font-medium hover:bg-gray-600 disabled:opacity-50"
                      title="Listeden kaldır (pasif yap)"
                    >
                      <EyeOff className="w-4 h-4" />
                      Listeden kaldır
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteArtist(row)}
                    disabled={deletingId === row.id || !supabase}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/50 text-red-300 text-sm font-medium hover:bg-red-900/70 disabled:opacity-50"
                    title="Kalıcı sil (kullanan rüya yoksa)"
                  >
                    {deletingId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Sil
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
