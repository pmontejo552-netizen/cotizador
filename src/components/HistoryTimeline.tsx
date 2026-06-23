'use client';

import { useEffect, useState } from 'react';
import type { HistoryDTO } from '@/lib/types';
import { api } from '@/lib/client';
import { roleLabel } from '@/lib/roles';

const ACTION_ICON: Record<string, string> = {
  crear: '➕',
  editar: '✏️',
  borrar: '🗑️',
  cerrar: '🔒',
  reabrir: '🔓',
  aprobar: '✅',
  importar: '⤓',
  estimar: '🔮',
};

export function HistoryTimeline({ quoteId, refreshKey }: { quoteId: string; refreshKey: number }) {
  const [items, setItems] = useState<HistoryDTO[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    api<HistoryDTO[]>(`/api/quotes/${quoteId}/history`).then(setItems);
  }, [quoteId, open, refreshKey]);

  return (
    <div className="card">
      <button
        className="flex w-full items-center justify-between font-bold"
        onClick={() => setOpen((o) => !o)}
      >
        <span>Historial de cambios</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ol className="mt-3 space-y-2">
          {items.length === 0 && <li className="text-sm text-slate-400">Sin cambios registrados.</li>}
          {items.map((h) => (
            <li key={h.id} className="flex gap-2 border-l-2 border-slate-100 pl-3 text-sm">
              <span>{ACTION_ICON[h.action] ?? '•'}</span>
              <div>
                <p className="text-slate-700">{h.detail}</p>
                <p className="text-xs text-slate-400">
                  {h.userName} · {roleLabel(h.userRole)} ·{' '}
                  {new Date(h.createdAt).toLocaleString('es-GT')}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
