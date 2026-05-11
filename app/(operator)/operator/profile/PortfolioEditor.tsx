'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

type PortfolioItem = {
  id: string;
  url: string;
  media_type: string;
  title: string | null;
  description: string | null;
  display_order: number;
};

export function PortfolioEditor({ operatorId, initial }: { operatorId: string; initial: PortfolioItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState<PortfolioItem[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    const sb = supabaseBrowser();
    const nextOrder = items.length;
    const added: PortfolioItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video/');
      const path = `${operatorId}/portfolio-${Date.now()}-${i}-${file.name}`;
      const { error: upErr } = await sb.storage.from('operator-portfolio').upload(path, file);
      if (upErr) continue;
      const url = sb.storage.from('operator-portfolio').getPublicUrl(path).data.publicUrl;
      const { data } = await sb.from('operator_portfolio_items').insert({
        operator_id: operatorId,
        url,
        media_type: isVideo ? 'video' : 'photo',
        display_order: nextOrder + i,
      }).select().single();
      if (data) added.push(data);
    }

    setItems((prev) => [...prev, ...added]);
    setUploading(false);
    e.target.value = '';
    router.refresh();
  }

  async function saveEdit(id: string) {
    const sb = supabaseBrowser();
    await sb.from('operator_portfolio_items').update({ title: editTitle || null, description: editDesc || null }).eq('id', id);
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, title: editTitle || null, description: editDesc || null } : item));
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    const sb = supabaseBrowser();
    await sb.from('operator_portfolio_items').delete().eq('id', id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    router.refresh();
  }

  function startEdit(item: PortfolioItem) {
    setEditing(item.id);
    setEditTitle(item.title ?? '');
    setEditDesc(item.description ?? '');
  }

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl">Portfolio</h3>
          <p className="text-xs text-ink-500 mt-0.5">Photos and videos of your work — seen by buildings and residents</p>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn-quiet text-sm"
        >
          {uploading ? 'Uploading…' : '+ Add media'}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFiles}
      />

      {items.length === 0 && !uploading && (
        <div
          className="h-32 rounded-xl border-2 border-dashed border-ink-600 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-gleam/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="text-2xl">🖼️</span>
          <span className="text-sm text-ink-400">Upload photos or videos of your work</span>
          <span className="text-xs text-ink-600">JPG, PNG, MP4, MOV · Operators with 4+ photos get 3× more partnerships</span>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="group relative">
              <div className="relative h-32 rounded-lg overflow-hidden bg-ink-800">
                {item.media_type === 'video' ? (
                  <video src={item.url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={item.url} alt={item.title ?? ''} className="w-full h-full object-cover" />
                )}
                {item.media_type === 'video' && (
                  <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded text-xs bg-black/70 text-white">▶ Video</div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="w-8 h-8 rounded-full bg-white/20 text-white text-sm hover:bg-gleam hover:text-black transition-colors"
                    title="Edit caption"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="w-8 h-8 rounded-full bg-white/20 text-white text-sm hover:bg-red-600 transition-colors"
                    title="Remove"
                  >
                    🗑
                  </button>
                </div>
              </div>
              {item.title && (
                <p className="mt-1 text-xs text-ink-400 truncate">{item.title}</p>
              )}

              {/* Inline edit panel */}
              {editing === item.id && (
                <div className="mt-2 space-y-2">
                  <input
                    className="field text-sm"
                    placeholder="Caption"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                  <textarea
                    className="field text-sm min-h-[60px]"
                    placeholder="Describe the job (optional)"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(item.id)} className="btn-primary text-xs">Save</button>
                    <button onClick={() => setEditing(null)} className="btn-quiet text-xs">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add more tile */}
          <div
            className="h-32 rounded-lg border-2 border-dashed border-ink-700 flex items-center justify-center cursor-pointer hover:border-gleam/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="text-2xl text-ink-600">+</span>
          </div>
        </div>
      )}
    </div>
  );
}
