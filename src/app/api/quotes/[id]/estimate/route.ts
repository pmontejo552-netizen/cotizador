import { prisma } from '@/lib/db';
import { ok, bad, actorFrom } from '@/lib/api';
import { logHistory } from '@/lib/history';
import { estimatePrice } from '@/lib/claude/estimate';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/quotes/:id/estimate  body: { itemId }
// Propone un precio estimado para un material sin precio (historial primero,
// luego Claude) + margen de seguridad. Lo aplica al renglón, marcado "estimado".
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const actor = actorFrom(body, req.headers);

  const quote = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!quote) return bad('Cotización no encontrada.', 404);
  if (quote.approved) return bad('Cotización aprobada (bloqueada).', 409);

  const item = await prisma.lineItem.findUnique({ where: { id: body.itemId } });
  if (!item || item.quoteId !== params.id) return bad('Renglón no encontrado.', 404);

  try {
    const est = await estimatePrice({
      quoteId: params.id,
      description: item.description,
      itemType: item.itemType,
      unit: item.unit,
      safetyPct: quote.estimateSafetyPct,
    });

    const updated = await prisma.lineItem.update({
      where: { id: item.id },
      data: {
        unitPrice: est.unitPrice,
        isEstimated: true,
        noPrice: false,
        estimateSource: est.source,
        estimateNote: est.note,
      },
    });

    await logHistory({
      quoteId: params.id,
      userName: actor.name,
      userRole: actor.role,
      section: 'precios',
      action: 'estimar',
      detail: `Estimó "${item.description}" en Q ${est.unitPrice.toFixed(2)} (fuente: ${
        est.source === 'history' ? 'historial' : 'Claude'
      }).`,
    });

    return ok({ item: updated, estimate: est });
  } catch (e) {
    return bad(e instanceof Error ? e.message : 'No se pudo estimar.', 500);
  }
}
