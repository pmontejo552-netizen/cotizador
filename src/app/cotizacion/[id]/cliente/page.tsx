'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { AttachmentDTO } from '@/lib/types';
import { api } from '@/lib/client';
import { formatMoney } from '@/lib/calc';

// Payload SEGURO que recibe la vista cliente / PDF. Viene de /api/quotes/:id/client,
// que calcula en el servidor y NO envía nada interno (markup, costos, %, márgenes, notas,
// precios unitarios). Acá no se hace ningún cálculo de costos.
interface ClientPayload {
  companyName: string;
  client: string;
  jobName: string;
  number: string;
  date: string;
  currency: string;
  ivaPct: number;
  estimatedDays: number | null;
  includeAttachmentsInPdf: boolean;
  partidas: { materiales: string[]; manoObra: string[]; otros: string[] };
  totals: { subtotal: number; iva: number; total: number };
}

// Vista limpia para el cliente. NO recibe ni muestra costos internos, markup ni ganancia.
// "Descargar PDF" e "Imprimir" usan la impresión del navegador (Guardar como PDF).
export default function ClientView() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ClientPayload | null>(null);
  const [atts, setAtts] = useState<AttachmentDTO[]>([]);

  useEffect(() => {
    api<ClientPayload>(`/api/quotes/${id}/client`).then(async (d) => {
      setData(d);
      if (d.includeAttachmentsInPdf) {
        try {
          setAtts(await api<AttachmentDTO[]>(`/api/quotes/${id}/attachments`));
        } catch {
          /* ignore */
        }
      }
    });
  }, [id]);

  if (!data) return <p className="py-16 text-center text-slate-400">Cargando…</p>;

  const cur = data.currency;

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
            <h1 className="text-2xl font-bold">{data.companyName}</h1>
            <p className="text-sm text-slate-500">Cotización</p>
          </div>
          <div className="text-right text-sm">
            <p>
              <span className="text-slate-400">N.º:</span> {data.number}
            </p>
            <p>
              <span className="text-slate-400">Fecha:</span>{' '}
              {new Date(data.date).toLocaleDateString('es-GT')}
            </p>
          </div>
        </div>

        <div className="my-4">
          <p className="text-sm text-slate-400">Cliente</p>
          <p className="text-lg font-semibold">{data.client}</p>
          <p className="text-slate-600">{data.jobName}</p>
          {data.estimatedDays != null && (
            <p className="mt-1 text-sm text-slate-500">
              Tiempo estimado de obra: {data.estimatedDays} días
            </p>
          )}
        </div>

        {/* Partidas (solo descripciones, sin costos internos) */}
        <div className="space-y-3">
          <PartidaGroup title="Materiales" items={data.partidas.materiales} />
          <PartidaGroup title="Mano de obra" items={data.partidas.manoObra} />
          <PartidaGroup title="Otros" items={data.partidas.otros} />
        </div>

        {/* Resumen financiero: solo subtotal, IVA y TOTAL */}
        <div className="mt-6 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium">{formatMoney(data.totals.subtotal, cur)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">IVA ({data.ivaPct}%)</span>
            <span className="font-medium">{formatMoney(data.totals.iva, cur)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-300 pt-2 text-lg font-bold">
            <span>TOTAL</span>
            <span>{formatMoney(data.totals.total, cur)}</span>
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
          Gracias por su preferencia · {data.companyName}
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
