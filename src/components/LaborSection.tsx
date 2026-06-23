'use client';

import type { LineItemDTO, QuoteDTO } from '@/lib/types';
import { api } from '@/lib/client';
import { formatMoney, laborRowSubtotal } from '@/lib/calc';
import { Cell } from './Editable';

export function LaborSection({
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
  const cur = quote.currency;

  async function add() {
    await api(`/api/quotes/${quote.id}/items`, { method: 'POST', body: { kind: 'labor' } });
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
  async function setDays(v: string) {
    await api(`/api/quotes/${quote.id}`, {
      method: 'PATCH',
      body: { estimatedDays: v === '' ? null : Number(v) },
    });
    onChanged();
  }

  return (
    <div className="space-y-3">
      <button className="btn-ghost" onClick={add} disabled={locked}>
        + Partida de mano de obra
      </button>

      {items.length === 0 && (
        <p className="py-3 text-center text-sm text-slate-400">Sin partidas todavía.</p>
      )}

      <div className="space-y-3">
        {items.map((it) => {
          const sub = laborRowSubtotal(it);
          return (
            <div key={it.id} className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex items-start gap-2">
                <Cell
                  value={it.description}
                  disabled={locked}
                  placeholder="Descripción de la partida"
                  onSave={(v) => patch(it.id, { description: v })}
                />
                <button className="btn-danger shrink-0 px-2" onClick={() => del(it.id)} disabled={locked}>
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-3 items-end gap-2">
                <div>
                  <label className="label">Cantidad</label>
                  <Cell value={it.quantity} type="number" align="right" disabled={locked} onSave={(v) => patch(it.id, { quantity: v })} />
                </div>
                <div>
                  <label className="label">Costo unit.</label>
                  <Cell value={it.unitPrice} type="number" align="right" disabled={locked} onSave={(v) => patch(it.id, { unitPrice: v })} />
                </div>
                <div className="text-right">
                  <span className="label">Subtotal</span>
                  <div className="font-semibold">{formatMoney(sub, cur)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-slate-50 p-3">
        <label className="label">Tiempo estimado de obra (días)</label>
        <Cell
          value={quote.estimatedDays ?? ''}
          type="number"
          disabled={locked}
          placeholder="Ej. 15"
          onSave={setDays}
        />
      </div>
    </div>
  );
}
