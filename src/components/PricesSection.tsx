'use client';

import { useState } from 'react';
import type { LineItemDTO, QuoteDTO } from '@/lib/types';
import { api } from '@/lib/client';
import { formatMoney, materialRowSubtotal } from '@/lib/calc';
import { Cell } from './Editable';
import { ExcelImportModal } from './ExcelImportModal';

// Apartado dedicado a PRECIOS. Acá cualquiera (típicamente el rol Precios)
// sube el Excel de precios —que Claude lee— y ajusta el precio de cada material.
// Materiales pone "qué y cuánto"; Precios pone "a cuánto".
export function PricesSection({
  quote,
  items,
  onChanged,
  locked,
}: {
  quote: QuoteDTO;
  items: LineItemDTO[]; // solo materiales
  onChanged: () => void;
  locked: boolean;
}) {
  const [showImport, setShowImport] = useState(false);
  const [estimating, setEstimating] = useState<string | null>(null);
  const cur = quote.currency;

  async function patch(id: string, data: Record<string, unknown>) {
    await api(`/api/quotes/${quote.id}/items/${id}`, { method: 'PATCH', body: data });
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

  const sinPrecio = items.filter((i) => i.noPrice || (!i.isEstimated && i.unitPrice === 0)).length;

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-marca/5 p-3 ring-1 ring-marca/15">
        <p className="text-sm text-slate-600">
          Subí el <b>Excel de precios</b> y Claude lo lee solo: detecta las columnas y actualiza
          los precios de los materiales (o crea los que falten). Cualquiera con el link puede subirlo.
        </p>
        <button className="btn-primary mt-2" onClick={() => setShowImport(true)} disabled={locked}>
          ⤓ Subir Excel de precios
        </button>
      </div>

      {items.length === 0 ? (
        <p className="py-3 text-center text-sm text-slate-400">
          Todavía no hay materiales. Pedile al rol Materiales que los agregue, o subí el Excel para crearlos.
        </p>
      ) : (
        <>
          {sinPrecio > 0 && (
            <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
              {sinPrecio} material(es) sin precio. Poné el precio a mano o usá “Estimar”.
            </p>
          )}
          <div className="space-y-2">
            {items.map((it) => {
              const sub = materialRowSubtotal(it);
              return (
                <div key={it.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{it.description || '(sin descripción)'}</p>
                      <p className="text-xs text-slate-400">
                        {(it.quantity || 0).toLocaleString('es-GT')} {it.unit || ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="label">Subtotal</span>
                      <div className="font-semibold">{formatMoney(sub, cur)}</div>
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="w-32">
                      <label className="label">Precio unitario</label>
                      <Cell
                        value={it.unitPrice}
                        type="number"
                        align="right"
                        disabled={locked}
                        className={it.isEstimated ? 'bg-amber-50' : ''}
                        onSave={(v) => patch(it.id, { unitPrice: v, _manualPrice: true })}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pb-1">
                      {it.isEstimated && (
                        <span className="chip bg-amber-100 text-amber-800" title={it.estimateNote ?? ''}>
                          ⚠ Estimado
                          {it.estimateSource === 'history'
                            ? ' (historial)'
                            : it.estimateSource === 'claude'
                            ? ' (Claude)'
                            : ''}
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
                            {estimating === it.id ? 'Estimando…' : 'Estimar'}
                          </button>
                          <button
                            className="text-xs text-slate-500 hover:underline"
                            onClick={() => patch(it.id, { noPrice: !it.noPrice })}
                          >
                            {it.noPrice ? 'Quitar “sin precio”' : 'Sin precio'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {it.isEstimated && it.estimateNote && (
                    <p className="mt-1 text-xs text-amber-700">{it.estimateNote}</p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

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
