'use client';

import type { LineItemDTO, QuoteDTO } from '@/lib/types';
import { api } from '@/lib/client';
import { formatMoney, materialRowSubtotal } from '@/lib/calc';
import { Cell } from './Editable';

// Apartado de MATERIALES: "qué y cuánto" (descripción, tipo, unidad, cantidad).
// El precio unitario se ve aquí (solo lectura) pero se carga en el apartado Precios.
export function MaterialsSection({
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
    await api(`/api/quotes/${quote.id}/items`, { method: 'POST', body: { kind: 'material' } });
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
      <button className="btn-ghost" onClick={add} disabled={locked}>
        + Renglón
      </button>
      <p className="text-xs text-slate-400">
        Acá va el material, su tipo, unidad y cantidad. El <b>precio</b> se carga en el apartado
        “Precios”.
      </p>

      {items.length === 0 && (
        <p className="py-4 text-center text-sm text-slate-400">Sin materiales todavía.</p>
      )}

      <div className="space-y-3">
        {items.map((it) => {
          const sub = materialRowSubtotal(it);
          return (
            <div key={it.id} className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex items-start gap-2">
                <Cell
                  value={it.description}
                  disabled={locked}
                  placeholder="Descripción del material"
                  onSave={(v) => patch(it.id, { description: v })}
                />
                <button className="btn-danger shrink-0 px-2" onClick={() => del(it.id)} disabled={locked}>
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Field label="Tipo">
                  <Cell value={it.itemType ?? ''} disabled={locked} onSave={(v) => patch(it.id, { itemType: v })} />
                </Field>
                <Field label="Unidad">
                  <Cell value={it.unit ?? ''} disabled={locked} placeholder="m, kg, saco…" onSave={(v) => patch(it.id, { unit: v })} />
                </Field>
                <Field label="Cantidad">
                  <Cell value={it.quantity} type="number" align="right" disabled={locked} onSave={(v) => patch(it.id, { quantity: v })} />
                </Field>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {it.isEstimated && <span className="chip bg-amber-100 text-amber-800">⚠ Precio estimado</span>}
                  {it.noPrice && <span className="chip bg-red-100 text-red-700">Sin precio</span>}
                </div>
                <div className="text-right text-sm">
                  <span className="text-slate-400">P. unit.: </span>
                  <span className="font-medium">{formatMoney(it.unitPrice, cur)}</span>
                  <span className="ml-2 text-slate-400">Subtotal: </span>
                  <span className="font-semibold">{formatMoney(sub, cur)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
