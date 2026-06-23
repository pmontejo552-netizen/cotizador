'use client';

import { useEffect, useState } from 'react';
import type { QuoteDTO } from '@/lib/types';
import { api } from '@/lib/client';
import { computeFromQuote, formatMoney, markupToMargin } from '@/lib/calc';

// Sección del Gerente: markup o margen objetivo (el sistema convierte entre los
// dos), muestra ganancia, precio sin IVA, IVA y precio final, y aprueba/bloquea.
// El permiso real se valida en el servidor; acá solo se habilita/deshabilita la UI.
export function MarkupSection({
  quote,
  role,
  onChanged,
}: {
  quote: QuoteDTO;
  role: string;
  onChanged: () => void;
}) {
  const isManager = role === 'gerente' || role === 'admin';
  const locked = quote.approved;
  const c = computeFromQuote(quote);
  const cur = quote.currency;

  const [markup, setMarkup] = useState(String(quote.markupPct));
  const [margin, setMargin] = useState(String(markupToMargin(quote.markupPct)));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    setMarkup(String(quote.markupPct));
    setMargin(String(markupToMargin(quote.markupPct)));
  }, [quote.markupPct]);

  async function saveMarkup(value: string) {
    setBusy(true);
    setErr('');
    try {
      await api(`/api/quotes/${quote.id}`, { method: 'PATCH', body: { markupPct: Number(value) } });
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }
  async function saveMargin(value: string) {
    setBusy(true);
    setErr('');
    try {
      await api(`/api/quotes/${quote.id}`, { method: 'PATCH', body: { targetMarginPct: Number(value) } });
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }
  async function approve(approveIt: boolean) {
    setBusy(true);
    setErr('');
    try {
      await api(`/api/quotes/${quote.id}/approve`, { method: 'POST', body: { approve: approveIt } });
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {!isManager && (
        <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500">
          El markup y el margen los edita el rol <b>Gerente</b>. Estás como{' '}
          <b>{role}</b>; podés ver los números pero no cambiarlos.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Markup %</label>
          <input
            type="number"
            inputMode="decimal"
            className="inp text-right"
            value={markup}
            disabled={!isManager || locked || busy}
            onChange={(e) => setMarkup(e.target.value)}
            onBlur={(e) => Number(e.target.value) !== quote.markupPct && saveMarkup(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Margen objetivo %</label>
          <input
            type="number"
            inputMode="decimal"
            className="inp text-right"
            value={margin}
            disabled={!isManager || locked || busy}
            onChange={(e) => setMargin(e.target.value)}
            onBlur={(e) => saveMargin(e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-slate-400">
        Markup y margen son dos vistas del mismo número. Escribí uno y el otro se recalcula.
      </p>

      <dl className="divide-y divide-slate-100 rounded-xl bg-slate-50 p-3 text-sm">
        <Row label="Costo base" value={formatMoney(c.costoBase, cur)} />
        <Row label={`Ganancia (markup ${quote.markupPct.toFixed(2)}%)`} value={formatMoney(c.ganancia, cur)} />
        <Row label={`Margen resultante`} value={`${c.margenPct.toFixed(2)}%`} />
        <Row label="Precio sin IVA" value={formatMoney(c.precioSinIva, cur)} strong />
        <Row label={`IVA (${quote.ivaPct}%)`} value={formatMoney(c.iva, cur)} />
      </dl>

      <div className="rounded-xl bg-marca/5 p-4 text-center ring-1 ring-marca/20">
        <span className="text-xs uppercase tracking-wide text-slate-500">Precio final</span>
        <div className="text-3xl font-bold text-marca">{formatMoney(c.precioFinal, cur)}</div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {isManager ? (
        locked ? (
          <button className="btn-ghost w-full" onClick={() => approve(false)} disabled={busy}>
            🔓 Desbloquear para editar
          </button>
        ) : (
          <button className="btn-primary w-full" onClick={() => approve(true)} disabled={busy}>
            ✓ Aprobar y bloquear precio final
          </button>
        )
      ) : (
        locked && (
          <p className="text-center text-sm text-emerald-700">
            ✓ Aprobada por {quote.approvedBy}
          </p>
        )
      )}
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
