'use client';

import { useState } from 'react';
import { api } from '@/lib/client';

interface Flag {
  id: string;
  priority: 'alta' | 'media' | 'baja';
  title: string;
  reason: string;
  section: string;
  itemRef?: string | null;
  source: 'regla' | 'claude';
}

const PRIO: Record<string, string> = {
  alta: 'bg-red-100 text-red-700',
  media: 'bg-amber-100 text-amber-700',
  baja: 'bg-slate-100 text-slate-600',
};

// Botón "Revisar": reglas fijas + análisis de Claude. Informativo, no bloquea.
export function ReviewPanel({ quoteId }: { quoteId: string }) {
  const [flags, setFlags] = useState<Flag[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [claudeNote, setClaudeNote] = useState('');

  async function run() {
    setBusy(true);
    setErr('');
    setClaudeNote('');
    try {
      const r = await api<{ flags: Flag[]; claudeUsed: boolean; claudeError?: string }>(
        `/api/quotes/${quoteId}/review`,
        { method: 'POST', body: {} },
      );
      setFlags(r.flags);
      if (!r.claudeUsed) {
        setClaudeNote(
          r.claudeError
            ? `Análisis de Claude no disponible: ${r.claudeError}`
            : 'Solo reglas fijas (sin ANTHROPIC_API_KEY, no se usó Claude).',
        );
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo revisar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold">Revisar antes de aprobar</h2>
          <p className="text-xs text-slate-400">Cosas que conviene revisar. Avisa, no bloquea.</p>
        </div>
        <button className="btn-primary" onClick={run} disabled={busy}>
          {busy ? 'Revisando…' : '🔍 Revisar'}
        </button>
      </div>

      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      {claudeNote && <p className="mt-2 text-xs text-slate-500">{claudeNote}</p>}

      {flags && (
        <div className="mt-3 space-y-2">
          {flags.length === 0 ? (
            <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              ✓ No se encontró nada que revisar.
            </p>
          ) : (
            flags.map((f) => (
              <div key={f.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <span className={`chip ${PRIO[f.priority]}`}>{f.priority}</span>
                  <span className="font-medium">{f.title}</span>
                  <span className="ml-auto text-xs text-slate-400">
                    {f.source === 'claude' ? 'Claude' : 'regla'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{f.reason}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Sección: {f.section}
                  {f.itemRef ? ` · Renglón: ${f.itemRef}` : ''}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
