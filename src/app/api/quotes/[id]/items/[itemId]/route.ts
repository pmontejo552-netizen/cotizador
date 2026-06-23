import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ok, bad, requireUser, forbidden, refreshStatus, touchSection } from '@/lib/api';
import { canEditSection, sectionForKind, sectionForMaterialEdit, type Section } from '@/lib/permissions';
import { logHistory } from '@/lib/history';

export const dynamic = 'force-dynamic';

const SECTION_LABEL: Record<string, string> = {
  materiales: 'materiales',
  precios: 'precios',
  mano_obra: 'mano_obra',
  otros: 'otros',
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
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const body = await req.json().catch(() => ({}));

  const q = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!q) return bad('Cotización no encontrada.', 404);
  if (q.approved) return bad('Cotización aprobada (bloqueada).', 409);

  const existing = await prisma.lineItem.findUnique({ where: { id: params.itemId } });
  if (!existing || existing.quoteId !== params.id) return bad('Renglón no encontrado.', 404);

  // Sección requerida: en materiales depende de si se toca el precio (rol Precios)
  // o los datos descriptivos (rol Materiales).
  const section: Section =
    existing.kind === 'material' ? sectionForMaterialEdit(body) : sectionForKind(existing.kind);
  if (!canEditSection(user.role, section)) {
    return forbidden('Tu rol no puede editar este dato.');
  }

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
  if ('unitPrice' in body && body._manualPrice) {
    data.isEstimated = false;
    data.noPrice = false;
    data.estimateSource = 'manual';
  }

  const updated = await prisma.lineItem.update({ where: { id: params.itemId }, data });
  await touchSection(params.id, existing.kind, user);
  if (section === 'precios' && existing.kind === 'material') {
    await prisma.quote.update({
      where: { id: params.id },
      data: { pricesLastBy: `${user.name} (${user.role})` },
    });
  }
  await logHistory({
    quoteId: params.id,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    section: SECTION_LABEL[section] || 'general',
    action: 'editar',
    detail: `Editó "${updated.description || existing.description || 'renglón'}".`,
  });
  return ok(updated);
}

// DELETE /api/quotes/:id/items/:itemId
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; itemId: string } },
) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const q = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!q) return bad('Cotización no encontrada.', 404);
  if (q.approved) return bad('Cotización aprobada (bloqueada).', 409);

  const existing = await prisma.lineItem.findUnique({ where: { id: params.itemId } });
  if (!existing || existing.quoteId !== params.id) return bad('Renglón no encontrado.', 404);

  if (!canEditSection(user.role, sectionForKind(existing.kind))) {
    return forbidden('Tu rol no puede borrar renglones de esta sección.');
  }

  await prisma.lineItem.delete({ where: { id: params.itemId } });
  await logHistory({
    quoteId: params.id,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    section: sectionForKind(existing.kind),
    action: 'borrar',
    detail: `Borró "${existing.description || 'renglón'}".`,
  });
  await refreshStatus(params.id);
  return ok({ deleted: true });
}
