'use client';

import { useState } from 'react';
import type { LineItemDTO, QuoteDTO } from '@/lib/types';
import { api } from '@/lib/client';
import { formatMoney, materialRowSubtotal } from '@/lib/calc';
import { Cell } from './Editable';
import { ExcelImportModal } from './ExcelImportModal';

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
  const [showImport, setShowImport] = useState(false);
  const [estimating, setEstimating] = useState<string | null>(null);
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
  async function estimate(id: string) {
    setEstimating(id);
    try {
      await api(`/api/quotes/${quote.id}/estimate`, { method: 'POST', body: { itemId: id } });
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo estimar.');
    } finally {
      setEstimating(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost" onClick={add} disabled={locked}>
          + Renglón
        </button>
        <button className="btn-ghost" onClick={() => setShowImport(true)} disabled={locked}>
          ⤓ Importar Excel
        </button>
      </div>

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

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Field label="Tipo">
                  <Cell value={it.itemType ?? ''} disabled={locked} onSave={(v) => patch(it.id, { itemType: v })} />
                </Field>
                <Field label="Unidad">
                  <Cell value={it.unit ?? ''} disabled={locked} placeholder="m, kg, saco…" onSave={(v) => patch(it.id, { unit: v })} />
                </Field>
                <Field label="Cantidad">
                  <Cell value={it.quantity} type="number" align="right" disabled={locked} onSave={(v) => patch(it.id, { quantity: v })} />
                </Field>
                <Field label="Precio unit.">
                  <Cell
                    value={it.unitPrice}
                    type="number"
                    align="right"
                    disabled={locked}
                    className={it.isEstimated ? 'bg-amber-50' : ''}
                    onSave={(v) => patch(it.id, { unitPrice: v, _manualPrice: true })}
                  />
                </Field>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {it.isEstimated && (
                    <span className="chip bg-amber-100 text-amber-800" title={it.estimateNote ?? ''}>
                      ⚠ Estimado
                      {it.estimateSource === 'history' ? ' (historial)' : it.estimateSource === 'claude' ? ' (Claude)' : ''}
                    </span>
                  )}
                  {it.noPrice && <span className="chip bg-red-100 text-red-700">Sin precio</span>}
                  {!locked && (
                    <>
                      <button
                        className="text-xs text-marca hover:underline disabled:opacity-50"
                        onClick={() => estimate(it.id)}
                        disabled={estimating === it.id}
                      >
                        {estimating === it.id ? 'Estimando…' : 'Estimar precio'}
                      </button>
                      <button
                        className="text-xs text-slate-500 hover:underline"
                        onClick={() => patch(it.id, { noPrice: !it.noPrice })}
                      >
                        {it.noPrice ? 'Quitar “sin precio”' : 'Marcar sin precio'}
                      </button>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <span className="label">Subtotal</span>
                  <div className="font-semibold">{formatMoney(sub, cur)}</div>
                </div>
              </div>
              {it.isEstimated && it.estimateNote && (
                <p className="mt-1 text-xs text-amber-700">{it.estimateNote}</p>
              )}
            </div>
          );
        })}
      </div>

      {showImport && (
        <ExcelImportModal
          quoteId={quote.id}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
