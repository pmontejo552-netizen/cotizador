import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ok, bad, requireUser } from '@/lib/api';
import { computeQuote } from '@/lib/calc';

export const dynamic = 'force-dynamic';

// GET /api/quotes/:id/client
// Payload SEGURO para el cliente / PDF. El cálculo se hace acá en el servidor con
// la MISMA función (calc.ts) y solo se devuelven los campos que el cliente puede ver.
// NO se incluye: costo base, % de desperdicio/imprevistos, markup, margen, ganancia,
// precios unitarios, costos de mano de obra, ni notas internas.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: { items: { orderBy: { position: 'asc' } } },
  });
  if (!quote) return bad('Cotización no encontrada.', 404);

  const items = quote.items;
  const totals = computeQuote({
    items: items.map((i) => ({
      kind: i.kind as any,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      amount: i.amount,
    })),
    wastePct: quote.wastePct,
    contingencyPct: quote.contingencyPct,
    markupPct: quote.markupPct,
    ivaPct: quote.ivaPct,
  });

  const desc = (kind: string) =>
    items.filter((i) => i.kind === kind && i.description.trim() !== '').map((i) => i.description);

  return ok({
    companyName: quote.companyName,
    client: quote.client,
    jobName: quote.jobName,
    number: quote.number,
    date: quote.date,
    currency: quote.currency,
    ivaPct: quote.ivaPct, // tasa de impuesto (visible en cualquier factura)
    estimatedDays: quote.estimatedDays,
    includeAttachmentsInPdf: quote.includeAttachmentsInPdf,
    partidas: {
      materiales: desc('material'),
      manoObra: desc('labor'),
      otros: desc('other'),
    },
    // Solo cifras de cara al cliente: subtotal (sin IVA), IVA y TOTAL.
    totals: {
      subtotal: totals.precioSinIva,
      iva: totals.iva,
      total: totals.precioFinal,
    },
  });
}
