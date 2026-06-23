import { prisma } from '@/lib/db';
import { ok, bad, actorFrom, refreshStatus, touchSection } from '@/lib/api';
import { logHistory } from '@/lib/history';

export const dynamic = 'force-dynamic';

const SECTION_BY_KIND: Record<string, string> = {
  material: 'materiales',
  labor: 'mano_obra',
  other: 'otros',
};

const EDITABLE = [
  'description',
  'itemType',
  'unit',
  'quantity',
  'unitPrice',
  'amount',
  'isEstimated',
  'noPrice',
  'estimateSource',
  'estimateNote',
];

// PATCH /api/quotes/:id/items/:itemId -> edita un renglón
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; itemId: string } },
) {
  const body = await req.json().catch(() => ({}));
  const actor = actorFrom(body, req.headers);

  const q = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!q) return bad('Cotización no encontrada.', 404);
  if (q.approved) return bad('Cotización aprobada (bloqueada).', 409);

  const existing = await prisma.lineItem.findUnique({ where: { id: params.itemId } });
  if (!existing || existing.quoteId !== params.id) return bad('Renglón no encontrado.', 404);

  const data: Record<string, unknown> = {};
  for (const f of EDITABLE) {
    if (f in body) {
      if (['quantity', 'unitPrice', 'amount'].includes(f)) {
        const n = parseFloat(String(body[f]));
        data[f] = isFinite(n) ? n : 0;
      } else {
        data[f] = body[f];
      }
    }
  }
  // Si editan el precio a mano, deja de ser estimado/sin precio.
  if ('unitPrice' in body && body._manualPrice) {
    data.isEstimated = false;
    data.noPrice = false;
    data.estimateSource = 'manual';
  }

  const updated = await prisma.lineItem.update({ where: { id: params.itemId }, data });
  await touchSection(params.id, existing.kind, actor);
  // Edición de precio a mano: queda atribuida también a la sección Precios.
  if (body._manualPrice && existing.kind === 'material') {
    await prisma.quote.update({
      where: { id: params.id },
      data: { pricesLastBy: `${actor.name} (${actor.role})` },
    });
  }
  await logHistory({
    quoteId: params.id,
    userName: actor.name,
    userRole: actor.role,
    section: SECTION_BY_KIND[existing.kind] || 'general',
    action: 'editar',
    detail: `Editó "${updated.description || existing.description || 'renglón'}".`,
  });
  return ok(updated);
}

// DELETE /api/quotes/:id/items/:itemId
export async function DELETE(
  req: Request,
  { params }: { params: { id: string; itemId: string } },
) {
  const actor = actorFrom({}, req.headers);
  const q = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!q) return bad('Cotización no encontrada.', 404);
  if (q.approved) return bad('Cotización aprobada (bloqueada).', 409);

  const existing = await prisma.lineItem.findUnique({ where: { id: params.itemId } });
  if (!existing || existing.quoteId !== params.id) return bad('Renglón no encontrado.', 404);

  await prisma.lineItem.delete({ where: { id: params.itemId } });
  await logHistory({
    quoteId: params.id,
    userName: actor.name,
    userRole: actor.role,
    section: SECTION_BY_KIND[existing.kind] || 'general',
    action: 'borrar',
    detail: `Borró "${existing.description || 'renglón'}".`,
  });
  await refreshStatus(params.id);
  return ok({ deleted: true });
}
