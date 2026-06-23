'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { QuoteDTO } from '@/lib/types';
import { api, useActor } from '@/lib/client';
import { progressPct } from '@/lib/calc';
import { IdentityGate, ActorBar } from '@/components/IdentityGate';
import { SectionShell } from '@/components/SectionShell';
import { MaterialsSection } from '@/components/MaterialsSection';
import { LaborSection } from '@/components/LaborSection';
import { OtherSection } from '@/components/OtherSection';
import { Consolidation } from '@/components/Consolidation';
import { MarkupSection } from '@/components/MarkupSection';
import { Attachments } from '@/components/Attachments';
import { HistoryTimeline } from '@/components/HistoryTimeline';
import { ReviewPanel } from '@/components/ReviewPanel';
import { Cell } from '@/components/Editable';

const POLL_MS = 6000; // auto-refresco compartido (polling). Listo para websockets a futuro.

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<QuoteDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [actor, setActor] = useActor();
  const [forceIdentity, setForceIdentity] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const editing = useRef(0); // # de inputs enfocados; pausa el polling al editar

  const load = useCallback(async () => {
    try {
      const q = await api<QuoteDTO>(`/api/quotes/${id}`);
      setQuote(q);
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo cargar.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const reload = useCallback(() => {
    setRefreshKey((k) => k + 1);
    load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  // Polling: refresca solo si nadie está editando un campo.
  useEffect(() => {
    const t = setInterval(() => {
      if (editing.current === 0) load();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  if (loading) return <p className="py-16 text-center text-slate-400">Cargando…</p>;
  if (err && !quote) return <p className="py-16 text-center text-red-600">{err}</p>;
  if (!quote) return null;

  const locked = quote.approved;
  const pct = progressPct(quote);

  const materials = quote.items.filter((i) => i.kind === 'material');
  const labor = quote.items.filter((i) => i.kind === 'labor');
  const others = quote.items.filter((i) => i.kind === 'other');

  async function patchHeader(data: Record<string, unknown>) {
    await api(`/api/quotes/${id}`, { method: 'PATCH', body: data });
    reload();
  }

  return (
    <main
      className="mx-auto max-w-3xl px-3 pb-28 pt-3 sm:px-4"
      onFocusCapture={(e) => {
        if ((e.target as HTMLElement).tagName.match(/INPUT|TEXTAREA|SELECT/)) editing.current++;
      }}
      onBlurCapture={(e) => {
        if ((e.target as HTMLElement).tagName.match(/INPUT|TEXTAREA|SELECT/))
          editing.current = Math.max(0, editing.current - 1);
      }}
    >
      {(!actor || forceIdentity) && (
        <IdentityGate
          actor={forceIdentity ? null : actor}
          onSet={(a) => {
            setActor(a);
            setForceIdentity(false);
          }}
        />
      )}

      {/* Barra superior */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link href="/" className="text-sm text-marca hover:underline">
          ← Tablero
        </Link>
        {actor && <ActorBar actor={actor} onChange={() => setForceIdentity(true)} />}
      </div>

      {/* Encabezado */}
      <div className="card mb-3">
        <div className="flex items-start justify-between gap-2">
          <input
            className="w-full bg-transparent text-lg font-bold outline-none"
            defaultValue={quote.jobName}
            disabled={locked}
            onBlur={(e) => e.target.value !== quote.jobName && patchHeader({ jobName: e.target.value })}
          />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Header label="Cliente">
            <Cell value={quote.client} disabled={locked} onSave={(v) => patchHeader({ client: v })} />
          </Header>
          <Header label="N.º">
            <Cell value={quote.number} disabled={locked} onSave={(v) => patchHeader({ number: v })} />
          </Header>
          <Header label="Empresa">
            <Cell value={quote.companyName} disabled={locked} onSave={(v) => patchHeader({ companyName: v })} />
          </Header>
          <Header label="Moneda">
            <select
              className="inp"
              value={quote.currency}
              disabled={locked}
              onChange={(e) => patchHeader({ currency: e.target.value })}
            >
              <option value="GTQ">Quetzal (Q)</option>
              <option value="USD">Dólar ($)</option>
            </select>
          </Header>
          <Header label="IVA %">
            <Cell value={quote.ivaPct} type="number" disabled={locked} onSave={(v) => patchHeader({ ivaPct: Number(v) })} />
          </Header>
          <Header label="Seguridad estimado %">
            <Cell value={quote.estimateSafetyPct} type="number" disabled={locked} onSave={(v) => patchHeader({ estimateSafetyPct: Number(v) })} />
          </Header>
        </div>
      </div>

      {/* Tablero de avance */}
      <div className="card mb-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-bold">Avance</span>
          <span className="text-sm text-slate-500">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-marca transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Stage label="Materiales" done={quote.materialsClosed} />
          <Stage label="Mano de obra" done={quote.laborClosed} />
          <Stage label="Otros" done={quote.otherClosed} />
          <Stage label="Markup" done={quote.markupClosed} />
          <Stage label="Aprobada" done={quote.approved} />
        </div>
        {locked && (
          <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">
            🔒 Aprobada y bloqueada por {quote.approvedBy}. Desbloqueá desde la sección 5 para editar.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <SectionShell
          quote={quote}
          sectionKey="materiales"
          noteKey="materiales"
          number={1}
          title="Materiales"
          closed={quote.materialsClosed}
          lastBy={quote.materialsLastBy}
          onChanged={reload}
        >
          <MaterialsSection quote={quote} items={materials} onChanged={reload} locked={locked} />
        </SectionShell>

        <SectionShell
          quote={quote}
          sectionKey="mano_obra"
          noteKey="mano_obra"
          number={2}
          title="Mano de obra y tiempos"
          closed={quote.laborClosed}
          lastBy={quote.laborLastBy}
          onChanged={reload}
        >
          <LaborSection quote={quote} items={labor} onChanged={reload} locked={locked} />
        </SectionShell>

        <SectionShell
          quote={quote}
          sectionKey="otros"
          noteKey="otros"
          number={3}
          title="Otros costos"
          closed={quote.otherClosed}
          lastBy={quote.otherLastBy}
          onChanged={reload}
        >
          <OtherSection quote={quote} items={others} onChanged={reload} locked={locked} />
        </SectionShell>

        <SectionShell
          quote={quote}
          noteKey="consolidacion"
          number={4}
          title="Consolidación (automática)"
          closable={false}
          onChanged={reload}
        >
          <Consolidation quote={quote} onChanged={reload} locked={locked} />
        </SectionShell>

        <SectionShell
          quote={quote}
          sectionKey="markup"
          noteKey="markup"
          number={5}
          title="Markup y precio final"
          closed={quote.markupClosed}
          lastBy={quote.markupLastBy}
          onChanged={reload}
        >
          {actor && <MarkupSection quote={quote} actor={actor} onChanged={reload} />}
        </SectionShell>

        <ReviewPanel quoteId={quote.id} />

        <div className="card">
          <h2 className="mb-3 font-bold">Planos y fotos</h2>
          <Attachments quoteId={quote.id} locked={locked} />
        </div>

        <HistoryTimeline quoteId={quote.id} refreshKey={refreshKey} />

        <Link href={`/cotizacion/${quote.id}/cliente`} className="btn-primary w-full">
          📄 Ver versión cliente / PDF
        </Link>
      </div>
    </main>
  );
}

function Header({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Stage({ label, done }: { label: string; done: boolean }) {
  return (
    <span className={`chip ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
      {done ? '✓' : '○'} {label}
    </span>
  );
}
