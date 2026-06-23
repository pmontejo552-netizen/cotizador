import { prisma } from '@/lib/db';
import { ok, bad, actorFrom, refreshStatus } from '@/lib/api';
import { logHistory } from '@/lib/history';

export const dynamic = 'force-dynamic';

const FIELD: Record<string, string> = {
  materiales: 'materialsClosed',
  precios: 'pricesClosed',
  mano_obra: 'laborClosed',
  otros: 'otherClosed',
  markup: 'markupClosed',
};

// POST /api/quotes/:id/close  body: { section, closed: bool }
// Cierra o reabre "mi parte" de una sección.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const actor = actorFrom(body, req.headers);
  const section = String(body.section || '');
  const field = FIELD[section];
  if (!field) return bad('Sección inválida.');

  const q = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!q) return bad('Cotización no encontrada.', 404);
  if (q.approved) return bad('Cotización aprobada (bloqueada).', 409);

  const closed = body.closed !== false;
  await prisma.quote.update({ where: { id: params.id }, data: { [field]: closed } });

  await logHistory({
    quoteId: params.id,
    userName: actor.name,
    userRole: actor.role,
    section,
    action: closed ? 'cerrar' : 'reabrir',
    detail: closed ? `Cerró la sección ${section}.` : `Reabrió la sección ${section}.`,
  });
  await refreshStatus(params.id);
  return ok({ ok: true });
}
