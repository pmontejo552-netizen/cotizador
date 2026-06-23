import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ok, bad, requireUser, forbidden } from '@/lib/api';
import { canEditSection, type Section } from '@/lib/permissions';
import { logHistory } from '@/lib/history';

export const dynamic = 'force-dynamic';

const NOTE_FIELD: Record<string, { col: string; section: Section }> = {
  materiales: { col: 'materialsNote', section: 'materiales' },
  precios: { col: 'pricesNote', section: 'precios' },
  mano_obra: { col: 'laborNote', section: 'mano_obra' },
  otros: { col: 'otherNote', section: 'otros' },
  consolidacion: { col: 'consolidationNote', section: 'consolidacion' },
  markup: { col: 'markupNote', section: 'markup' },
};

// PATCH /api/quotes/:id/notes  body: { section, note }
// La nota de cada sección la edita el rol dueño de esa sección.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const body = await req.json().catch(() => ({}));
  const cfg = NOTE_FIELD[String(body.section || '')];
  if (!cfg) return bad('Sección inválida.');

  if (!canEditSection(user.role, cfg.section)) {
    return forbidden('Tu rol no puede editar la nota de esta sección.');
  }

  const q = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!q) return bad('Cotización no encontrada.', 404);

  await prisma.quote.update({
    where: { id: params.id },
    data: { [cfg.col]: String(body.note ?? '') },
  });

  await logHistory({
    quoteId: params.id,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    section: String(body.section),
    action: 'editar',
    detail: `Actualizó la nota de ${body.section}.`,
  });
  return ok({ ok: true });
}
