'use client';

import { useEffect, useState } from 'react';
import type { QuoteDTO } from '@/lib/types';
import { api } from '@/lib/client';

// Envoltorio común de cada sección: título, estado de cierre, "cerrar mi parte",
// nota de la sección y quién la tocó por última vez.
export function SectionShell({
  quote,
  sectionKey, // materiales | mano_obra | otros | markup (para cerrar)
  noteKey, // materiales | mano_obra | otros | consolidacion | markup (para notas)
  number,
  title,
  closable = true,
  closed = false,
  lastBy,
  onChanged,
  children,
}: {
  quote: QuoteDTO;
  sectionKey?: string;
  noteKey: string;
  number: number;
  title: string;
  closable?: boolean;
  closed?: boolean;
  lastBy?: string | null;
  onChanged: () => void;
  children: React.ReactNode;
}) {
  const noteValueMap: Record<string, string | null> = {
    materiales: quote.materialsNote,
    mano_obra: quote.laborNote,
    otros: quote.otherNote,
    consolidacion: quote.consolidationNote,
    markup: quote.markupNote,
  };
  const [note, setNote] = useState(noteValueMap[noteKey] ?? '');
  const [showNote, setShowNote] = useState(Boolean(noteValueMap[noteKey]));

  useEffect(() => {
    setNote(noteValueMap[noteKey] ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote.id]);

  const locked = quote.approved;

  async function toggleClose() {
    if (!sectionKey) return;
    await api(`/api/quotes/${quote.id}/close`, {
      method: 'POST',
      body: { section: sectionKey, closed: !closed },
    });
    onChanged();
  }

  async function saveNote() {
    await api(`/api/quotes/${quote.id}/notes`, {
      method: 'PATCH',
      body: { section: noteKey, note },
    });
    onChanged();
  }

  return (
    <section className="card scroll-mt-4" id={`sec-${noteKey}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marca/10 text-xs text-marca">
            {number}
          </span>
          {title}
        </h2>
        {closable && sectionKey && (
          <button
            onClick={toggleClose}
            disabled={locked}
            className={`chip ${
              closed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
            } disabled:opacity-50`}
          >
            {closed ? '✓ Cerrada' : 'Cerrar mi parte'}
          </button>
        )}
      </div>

      {children}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
        <div className="text-xs text-slate-400">
          {lastBy ? `Último cambio: ${lastBy}` : 'Sin cambios todavía'}
        </div>
        {!showNote ? (
          <button className="text-xs text-marca hover:underline" onClick={() => setShowNote(true)}>
            + Agregar nota
          </button>
        ) : null}
      </div>

      {showNote && (
        <div className="mt-2">
          <label className="label">Nota de la sección</label>
          <textarea
            className="inp"
            rows={2}
            placeholder="Ej. estos precios suben la otra semana"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={saveNote}
          />
        </div>
      )}
    </section>
  );
}
