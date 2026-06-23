'use client';

import type { QuoteDTO } from '@/lib/types';
import { api } from '@/lib/client';
import { computeFromQuote, formatMoney } from '@/lib/calc';
import { Cell } from './Editable';

export function Consolidation({
  quote,
  onChanged,
  locked,
}: {
  quote: QuoteDTO;
  onChanged: () => void;
  locked: boolean;
}) {
  const c = computeFromQuote(quote);
  const cur = quote.currency;

  async function patch(data: Record<string, unknown>) {
    await api(`/api/quotes/${quote.id}`, { method: 'PATCH', body: data });
    onChanged();
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Desperdicio % (sobre materiales)</label>
          <Cell value={quote.wastePct} type="number" disabled={locked} onSave={(v) => patch({ wastePct: Number(v) })} />
        </div>
        <div>
          <label className="label">Imprevistos % (sobre el costo)</label>
          <Cell value={quote.contingencyPct} type="number" disabled={locked} onSave={(v) => patch({ contingencyPct: Number(v) })} />
        </div>
      </div>

      <dl className="divide-y divide-slate-100 rounded-xl bg-slate-50 p-3 text-sm">
        <Row label="Subtotal materiales" value={formatMoney(c.subtotalMateriales, cur)} />
        <Row label={`Desperdicio (${quote.wastePct}%)`} value={formatMoney(c.desperdicio, cur)} />
        <Row label="Materiales con desperdicio" value={formatMoney(c.materialesTotal, cur)} strong />
        <Row label="Subtotal mano de obra" value={formatMoney(c.subtotalManoObra, cur)} />
        <Row label="Subtotal otros costos" value={formatMoney(c.subtotalOtros, cur)} />
        <Row label="Suma de costos" value={formatMoney(c.sumaCostos, cur)} />
        <Row label={`Imprevistos (${quote.contingencyPct}%)`} value={formatMoney(c.imprevistos, cur)} />
        <Row label="Costo base" value={formatMoney(c.costoBase, cur)} strong />
      </dl>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <dt className={strong ? 'font-semibold text-slate-700' : 'text-slate-500'}>{label}</dt>
      <dd className={strong ? 'font-bold' : 'font-medium text-slate-700'}>{value}</dd>
    </div>
  );
}
