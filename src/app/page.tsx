'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { computeQuote, progressPct, formatMoney } from '@/lib/calc';
import { StatusBadge, ProgressBar } from '@/components/StatusBadge';

interface QuoteRow {
  id: string;
  number: string;
  jobName: string;
  client: string;
  status: string;
  currency: string;
  date: string;
  updatedAt: string;
  markupPct: number;
  wastePct: number;
  contingencyPct: number;
  ivaPct: number;
  approved: boolean;
  materialsClosed: boolean;
  pricesClosed: boolean;
  laborClosed: boolean;
  otherClosed: boolean;
  markupClosed: boolean;
  items: { kind: string; quantity: number; unitPrice: number; amount: number | null }[];
}

export default function Dashboard() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [clientFilter, setClientFilter] = useState('todos');
  const [showNew, setShowNew] = useState(false);

  async function load() {
    try {
      const data = await api<QuoteRow[]>('/api/quotes');
      setQuotes(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const clients = useMemo(
    () => Array.from(new Set(quotes.map((x) => x.client))).sort(),
    [quotes],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return quotes.filter((x) => {
      if (statusFilter !== 'todos' && x.status !== statusFilter) return false;
      if (clientFilter !== 'todos' && x.client !== clientFilter) return false;
      if (term) {
        const hay = `${x.jobName} ${x.client} ${x.number}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [quotes, q, statusFilter, clientFilter]);

  return (
    <main className="mx-auto max-w-4xl px-3 pb-24 pt-4 sm:px-4">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Cotizaciones</h1>
          <p className="text-sm text-slate-500">Tablero del equipo</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}>
          + Nueva
        </button>
      </header>

      {/* Buscar y filtrar */}
      <div className="card mb-4 space-y-3">
        <input
          className="inp"
          placeholder="Buscar por trabajo, cliente o N.º…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <select className="inp max-w-[48%] sm:max-w-[180px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="todos">Todos los estados</option>
            <option value="borrador">Borrador</option>
            <option value="en_proceso">En proceso</option>
            <option value="aprobada">Aprobada</option>
          </select>
          <select className="inp max-w-[48%] sm:max-w-[220px]" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
            <option value="todos">Todos los clientes</option>
            {clients.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-slate-400">Cargando…</p>
      ) : filtered.length === 0 ? (
        <div className="card text-center text-slate-500">
          No hay cotizaciones todavía. Creá la primera con “+ Nueva”.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((x) => {
            const calc = computeQuote({
              items: x.items as any,
              wastePct: x.wastePct,
              contingencyPct: x.contingencyPct,
              markupPct: x.markupPct,
              ivaPct: x.ivaPct,
            });
            const pct = progressPct(x);
            return (
              <li key={x.id}>
                <Link href={`/cotizacion/${x.id}`} className="card block transition hover:ring-marca/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{x.jobName}</p>
                      <p className="truncate text-sm text-slate-500">
                        {x.client} · {x.number}
                      </p>
                    </div>
                    <StatusBadge status={x.status} />
                  </div>
                  <div className="mt-3">
                    <ProgressBar pct={pct} />
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <span className="text-xs text-slate-400">
                      {new Date(x.date).toLocaleDateString('es-GT')}
                    </span>
                    <span className="text-right">
                      <span className="block text-[11px] uppercase tracking-wide text-slate-400">
                        Precio final
                      </span>
                      <span className="text-lg font-bold text-marca">
                        {formatMoney(calc.precioFinal, x.currency)}
                      </span>
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                    <DuplicateButton id={x.id} onDone={load} />
                    <span className="btn-ghost pointer-events-none ml-auto opacity-70">Abrir →</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {showNew && <NewQuoteModal onClose={() => setShowNew(false)} onCreated={load} />}
    </main>
  );
}

function DuplicateButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn-ghost"
      disabled={busy}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setBusy(true);
        try {
          await api(`/api/quotes/${id}/duplicate`, { method: 'POST', body: {} });
          onDone();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? '…' : '⎘ Duplicar'}
    </button>
  );
}

function NewQuoteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({
    jobName: '',
    client: '',
    companyName: 'Mi Empresa',
    currency: 'GTQ',
    ivaPct: 12,
    wastePct: 5,
    contingencyPct: 5,
    markupPct: 30,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    if (!form.jobName || !form.client) {
      setErr('El nombre del trabajo y el cliente son obligatorios.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const created = await api<{ id: string }>('/api/quotes', { method: 'POST', body: form });
      onCreated();
      router.push(`/cotizacion/${created.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al crear.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-4 sm:rounded-2xl">
        <h2 className="mb-3 text-lg font-bold">Nueva cotización</h2>
        <div className="space-y-3">
          <div>
            <label className="label">Nombre del trabajo *</label>
            <input className="inp" value={form.jobName} onChange={(e) => setForm({ ...form, jobName: e.target.value })} />
          </div>
          <div>
            <label className="label">Cliente *</label>
            <input className="inp" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
          </div>
          <div>
            <label className="label">Empresa (para el PDF)</label>
            <input className="inp" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Moneda</label>
              <select className="inp" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option value="GTQ">Quetzal (Q)</option>
                <option value="USD">Dólar ($)</option>
              </select>
            </div>
            <div>
              <label className="label">IVA %</label>
              <input type="number" className="inp" value={form.ivaPct} onChange={(e) => setForm({ ...form, ivaPct: +e.target.value })} />
            </div>
            <div>
              <label className="label">Desperdicio %</label>
              <input type="number" className="inp" value={form.wastePct} onChange={(e) => setForm({ ...form, wastePct: +e.target.value })} />
            </div>
            <div>
              <label className="label">Imprevistos %</label>
              <input type="number" className="inp" value={form.contingencyPct} onChange={(e) => setForm({ ...form, contingencyPct: +e.target.value })} />
            </div>
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>
        <div className="mt-4 flex gap-2">
          <button className="btn-ghost flex-1" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn-primary flex-1" onClick={submit} disabled={busy}>
            {busy ? 'Creando…' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}
