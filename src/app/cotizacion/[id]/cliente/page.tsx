'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { AttachmentDTO, QuoteDTO } from '@/lib/types';
import { api } from '@/lib/client';
import { computeFromQuote, formatMoney } from '@/lib/calc';

// Vista limpia para el cliente. NO muestra costos internos, markup ni ganancia.
// "Descargar PDF" e "Imprimir" usan la impresión del navegador (Guardar como PDF).
export default function ClientView() {
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<QuoteDTO | null>(null);
  const [atts, setAtts] = useState<AttachmentDTO[]>([]);

  useEffect(() => {
    api<QuoteDTO>(`/api/quotes/${id}`).then(async (q) => {
      setQuote(q);
      if (q.includeAttachmentsInPdf) {
        try {
          setAtts(await api<AttachmentDTO[]>(`/api/quotes/${id}/attachments`));
        } catch {
          /* ignore */
        }
      }
    });
  }, [id]);

  if (!quote) return <p className="py-16 text-center text-slate-400">Cargando…</p>;

  const c = computeFromQuote(quote);
  const cur = quote.currency;
  const materials = quote.items.filter((i) => i.kind === 'material' && i.description.trim());
  const labor = quote.items.filter((i) => i.kind === 'labor' && i.description.trim());
  const others = quote.items.filter((i) => i.kind === 'other' && i.description.trim());

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      {/* Barra de acciones (no se imprime) */}
      <div className="no-print mb-4 flex items-center justify-between gap-2">
        <Link href={`/cotizacion/${id}`} className="text-sm text-marca hover:underline">
          ← Volver a editar
        </Link>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => window.print()}>
            🖨 Imprimir
          </button>
          <button className="btn-primary" onClick={() => window.print()}>
            ⤓ Descargar PDF
          </button>
        </div>
      </div>

      {/* Área imprimible */}
      <div className="print-area card mx-auto bg-white p-8">
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold">{quote.companyName}</h1>
            <p className="text-sm text-slate-500">Cotización</p>
          </div>
          <div className="text-right text-sm">
            <p>
              <span className="text-slate-400">N.º:</span> {quote.number}
            </p>
            <p>
              <span className="text-slate-400">Fecha:</span>{' '}
              {new Date(quote.date).toLocaleDateString('es-GT')}
            </p>
          </div>
        </div>

        <div className="my-4">
          <p className="text-sm text-slate-400">Cliente</p>
          <p className="text-lg font-semibold">{quote.client}</p>
          <p className="text-slate-600">{quote.jobName}</p>
          {quote.estimatedDays != null && (
            <p className="mt-1 text-sm text-slate-500">
              Tiempo estimado de obra: {quote.estimatedDays} días
            </p>
          )}
        </div>

        {/* Partidas (descripciones, sin costos internos) */}
        <div className="space-y-3">
          <PartidaGroup title="Materiales" items={materials.map((i) => i.description)} />
          <PartidaGroup title="Mano de obra" items={labor.map((i) => i.description)} />
          <PartidaGroup title="Otros" items={others.map((i) => i.description)} />
        </div>

        {/* Resumen financiero: solo subtotal, IVA y TOTAL */}
        <div className="mt-6 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium">{formatMoney(c.precioSinIva, cur)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">IVA ({quote.ivaPct}%)</span>
            <span className="font-medium">{formatMoney(c.iva, cur)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-300 pt-2 text-lg font-bold">
            <span>TOTAL</span>
            <span>{formatMoney(c.precioFinal, cur)}</span>
          </div>
        </div>

        {/* Adjuntos opcionales (solo imágenes) */}
        {atts.length > 0 && (
          <div className="mt-8 border-t border-slate-200 pt-4">
            <p className="mb-2 text-sm font-semibold text-slate-500">Planos y fotos</p>
            <div className="grid grid-cols-2 gap-3">
              {atts
                .filter((a) => a.mimeType.startsWith('image/'))
                .map((a) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={a.id}
                    src={`/api/quotes/${id}/attachments/${a.id}`}
                    alt={a.originalName}
                    className="w-full rounded-lg border border-slate-200"
                  />
                ))}
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          Gracias por su preferencia · {quote.companyName}
        </p>
      </div>

      <p className="no-print mt-3 text-center text-xs text-slate-400">
        Para guardar como PDF, elegí “Guardar como PDF” en el destino de impresión.
      </p>
    </main>
  );
}

function PartidaGroup({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="font-semibold text-slate-700">{title}</p>
      <ul className="mt-1 list-inside list-disc text-sm text-slate-600">
        {items.map((d, i) => (
          <li key={i}>{d}</li>
        ))}
      </ul>
    </div>
  );
}
