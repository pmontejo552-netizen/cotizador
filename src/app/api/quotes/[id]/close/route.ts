import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ok, bad, requireUser, forbidden, refreshStatus } from '@/lib/api';
import { canEditSection, type Section } from '@/lib/permissions';
import { logHistory } from '@/lib/history';

export const dynamic = 'force-dynamic';

const FIELD: Record<string, { col: string; section: Section }> = {
  materiales: { col: 'materialsClosed', section: 'materiales' },
  precios: { col: 'pricesClosed', section: 'precios' },
  mano_obra: { col: 'laborClosed', section: 'mano_obra' },
  otros: { col: 'otherClosed', section: 'otros' },
  markup: { col: 'markupClosed', section: 'markup' },
};

// POST /api/quotes/:id/close  body: { section, closed: bool }
// Cada rol cierra/reabre SOLO su sección (verificado en el servidor).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const body = await req.json().catch(() => ({}));
  const section = String(body.section || '');
  const cfg = FIELD[section];
  if (!cfg) return bad('Sección inválida.');

  if (!canEditSection(user.role, cfg.section)) {
    return forbidden('Tu rol no puede cerrar/reabrir esta sección.');
  }

  const q = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!q) return bad('Cotización no encontrada.', 404);
  if (q.approved) return bad('Cotización aprobada (bloqueada).', 409);

  const closed = body.closed !== false;
  await prisma.quote.update({ where: { id: params.id }, data: { [cfg.col]: closed } });

  await logHistory({
    quoteId: params.id,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    section,
    action: closed ? 'cerrar' : 'reabrir',
    detail: closed ? `Cerró la sección ${section}.` : `Reabrió la sección ${section}.`,
  });
  await refreshStatus(params.id);
  return ok({ ok: true });
}
