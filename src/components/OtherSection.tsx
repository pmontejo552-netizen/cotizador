'use client';

import { useState } from 'react';
import type { LineItemDTO, QuoteDTO } from '@/lib/types';
import { api } from '@/lib/client';
import { formatMoney } from '@/lib/calc';
import { Cell } from './Editable';
import { ExcelImportModal } from './ExcelImportModal';

export function OtherSection({
  quote,
  items,
  onChanged,
  locked,
}: {
  quote: QuoteDTO;
  items: LineItemDTO[];
  onChanged: () => void;
  locked: boolean;
}) {
  const [showImport, setShowImport] = useState(false);

  async function add() {
    await api(`/api/quotes/${quote.id}/items`, { method: 'POST', body: { kind: 'other' } });
    onChanged();
  }
  async function patch(id: string, data: Record<string, unknown>) {
    await api(`/api/quotes/${quote.id}/items/${id}`, { method: 'PATCH', body: data });
    onChanged();
  }
  async function del(id: string) {
    await api(`/api/quotes/${quote.id}/items/${id}`, { method: 'DELETE' });
    onChanged();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost" onClick={add} disabled={locked}>
          + Concepto
        </button>
        <button className="btn-ghost" onClick={() => setShowImport(true)} disabled={locked}>
          ⤓ Importar Excel
        </button>
      </div>
      {items.length === 0 && (
        <p className="py-3 text-center text-sm text-slate-400">
          Sin otros costos (transporte, equipo, imprevistos puntuales…). Cargalos a mano o subí un
          Excel que Claude lee.
        </p>
      )}
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-end gap-2 rounded-xl border border-slate-200 p-2">
            <div className="flex-1">
              <label className="label">Concepto</label>
              <Cell
                value={it.description}
                disabled={locked}
                placeholder="Ej. Transporte de material"
                onSave={(v) => patch(it.id, { description: v })}
              />
            </div>
            <div className="w-28">
              <label className="label">Monto</label>
              <Cell value={it.amount ?? 0} type="number" align="right" disabled={locked} onSave={(v) => patch(it.id, { amount: v })} />
            </div>
            <button className="btn-danger shrink-0 px-2" onClick={() => del(it.id)} disabled={locked}>
              ✕
            </button>
          </div>
        ))}
      </div>
      {items.length > 0 && (
        <div className="text-right text-sm text-slate-500">
          Subtotal otros:{' '}
          <span className="font-semibold text-slate-800">
            {formatMoney(
              items.reduce((s, i) => s + (i.amount || 0), 0),
              quote.currency,
            )}
          </span>
        </div>
      )}

      {showImport && (
        <ExcelImportModal
          quoteId={quote.id}
          target="otros"
          onClose={() => setShowImport(false)}
          onApplied={() => {
            setShowImport(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}
