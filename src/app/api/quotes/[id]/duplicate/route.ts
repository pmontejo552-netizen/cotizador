import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ok, bad, requireUser, forbidden } from '@/lib/api';
import { canCreateQuote } from '@/lib/permissions';
import { logHistory } from '@/lib/history';

export const dynamic = 'force-dynamic';

// POST /api/quotes/:id/duplicate -> nueva versión (copia sin perder la original)
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!canCreateQuote(user.role)) return forbidden('Tu rol no puede duplicar cotizaciones.');

  const src = await prisma.quote.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  if (!src) return bad('Cotización no encontrada.', 404);

  const year = new Date().getFullYear();
  const count = await prisma.quote.count();
  const number = `${src.number}-v${count + 1}`;

  const copy = await prisma.quote.create({
    data: {
      number,
      jobName: src.jobName,
      client: src.client,
      companyName: src.companyName,
      currency: src.currency,
      ivaPct: src.ivaPct,
      wastePct: src.wastePct,
      contingencyPct: src.contingencyPct,
      markupPct: src.markupPct,
      estimateSafetyPct: src.estimateSafetyPct,
      estimatedDays: src.estimatedDays,
      materialsNote: src.materialsNote,
      laborNote: src.laborNote,
      otherNote: src.otherNote,
      consolidationNote: src.consolidationNote,
      markupNote: src.markupNote,
      status: 'borrador',
      items: {
        create: src.items.map((it) => ({
          kind: it.kind,
          description: it.description,
          itemType: it.itemType,
          unit: it.unit,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          amount: it.amount,
          isEstimated: it.isEstimated,
          noPrice: it.noPrice,
          estimateSource: it.estimateSource,
          estimateNote: it.estimateNote,
          position: it.position,
        })),
      },
    },
  });

  await logHistory({
    quoteId: copy.id,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    section: 'general',
    action: 'crear',
    detail: `Nueva versión duplicada de ${src.number}.`,
  });

  return ok(copy, { status: 201 });
}
