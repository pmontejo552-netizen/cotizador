'use client';

import { useEffect, useState } from 'react';
import type { AttachmentDTO } from '@/lib/types';
import { api, readActor } from '@/lib/client';

export function Attachments({ quoteId, locked }: { quoteId: string; locked: boolean }) {
  const [list, setList] = useState<AttachmentDTO[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    setList(await api<AttachmentDTO[]>(`/api/quotes/${quoteId}/attachments`));
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId]);

  async function upload(file: File) {
    setBusy(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const actor = readActor();
      fd.append('_actorName', actor.name);
      fd.append('_actorRole', actor.role);
      await api(`/api/quotes/${quoteId}/attachments`, { method: 'POST', body: fd });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo subir.');
    } finally {
      setBusy(false);
    }
  }
  async function del(id: string) {
    if (!confirm('¿Borrar este adjunto?')) return;
    await api(`/api/quotes/${quoteId}/attachments/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="space-y-3">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
        ⤓ Subir plano o foto
        <input
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </label>
      {busy && <span className="ml-2 text-sm text-slate-400">Subiendo…</span>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {list.length === 0 ? (
        <p className="text-sm text-slate-400">Sin adjuntos (PDF e imágenes).</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {list.map((a) => {
            const isImg = a.mimeType.startsWith('image/');
            const url = `/api/quotes/${quoteId}/attachments/${a.id}`;
            return (
              <div key={a.id} className="overflow-hidden rounded-xl border border-slate-200">
                <a href={url} target="_blank" rel="noreferrer" className="block">
                  {isImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={a.originalName} className="h-24 w-full object-cover" />
                  ) : (
                    <div className="flex h-24 items-center justify-center bg-slate-50 text-3xl">📄</div>
                  )}
                </a>
                <div className="p-2">
                  <p className="truncate text-xs font-medium" title={a.originalName}>
                    {a.originalName}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <a href={`${url}?download=1`} className="text-marca hover:underline">
                      Descargar
                    </a>
                    <button className="text-red-600 hover:underline" onClick={() => del(a.id)}>
                      Borrar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
