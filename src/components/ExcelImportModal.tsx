'use client';

import { useState } from 'react';
import { api, readActor } from '@/lib/client';

interface Parsed {
  description: string;
  itemType: string | null;
  unit: string | null;
  quantity: number | null;
  unitPrice: number | null;
}

// Sube el Excel, Claude detecta las columnas, el usuario REVISA la vista previa
// y confirma. 'create' crea/actualiza renglones; 'prices' solo actualiza precios.
export function ExcelImportModal({
  quoteId,
  onClose,
  onApplied,
}: {
  quoteId: string;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [step, setStep] = useState<'pick' | 'review'>('pick');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [rows, setRows] = useState<Parsed[]>([]);
  const [mode, setMode] = useState<'create' | 'prices'>('create');

  async function upload(file: File) {
    setBusy(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const actor = readActor();
      fd.append('_actorName', actor.name);
      fd.append('_actorRole', actor.role);
      const res = await api<{ items: Parsed[] }>(`/api/quotes/${quoteId}/import-excel`, {
        method: 'POST',
        body: fd,
      });
      setRows(res.items);
      setStep('review');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo leer el Excel.');
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    setBusy(true);
    setErr('');
    try {
      await api(`/api/quotes/${quoteId}/import-excel/apply`, {
        method: 'POST',
        body: { items: rows, mode },
      });
      onApplied();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo aplicar.');
      setBusy(false);
    }
  }

  function edit(i: number, field: keyof Parsed, value: string) {
    setRows((r) => {
      const copy = [...r];
      const num = field === 'quantity' || field === 'unitPrice';
      (copy[i] as any)[field] = num ? (value === '' ? null : Number(value)) : value;
      return copy;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h2 className="text-lg font-bold">Importar Excel de precios</h2>
          <button className="text-slate-400" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {step === 'pick' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                Subí tu archivo .xlsx. Claude detecta las columnas (descripción, unidad, cantidad,
                precio) aunque tengan otros nombres. Vas a revisar antes de aplicar.
              </p>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-marca">
                <span className="text-sm font-medium text-marca">Elegir archivo Excel</span>
                <span className="mt-1 text-xs text-slate-400">.xlsx o .xls (máx. 12 MB)</span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                />
              </label>
              {busy && <p className="text-center text-sm text-slate-500">Leyendo con Claude…</p>}
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Se detectaron <b>{rows.length}</b> renglones. Revisá y corregí si hace falta.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400">
                      <th className="p-1">Descripción</th>
                      <th className="p-1">Unidad</th>
                      <th className="p-1">Cant.</th>
                      <th className="p-1">Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="p-1">
                          <input className="inp" value={r.description} onChange={(e) => edit(i, 'description', e.target.value)} />
                        </td>
                        <td className="p-1">
                          <input className="inp w-16" value={r.unit ?? ''} onChange={(e) => edit(i, 'unit', e.target.value)} />
                        </td>
                        <td className="p-1">
                          <input className="inp w-16 text-right" value={r.quantity ?? ''} onChange={(e) => edit(i, 'quantity', e.target.value)} />
                        </td>
                        <td className="p-1">
                          <input className="inp w-20 text-right" value={r.unitPrice ?? ''} onChange={(e) => edit(i, 'unitPrice', e.target.value)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        </div>

        {step === 'review' && (
          <div className="space-y-2 border-t border-slate-100 p-4">
            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-1">
                <input type="radio" checked={mode === 'create'} onChange={() => setMode('create')} />
                Crear / actualizar renglones
              </label>
              <label className="flex items-center gap-1">
                <input type="radio" checked={mode === 'prices'} onChange={() => setMode('prices')} />
                Solo actualizar precios
              </label>
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setStep('pick')} disabled={busy}>
                ← Volver
              </button>
              <button className="btn-primary flex-1" onClick={apply} disabled={busy}>
                {busy ? 'Aplicando…' : `Aplicar ${rows.length} renglones`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
