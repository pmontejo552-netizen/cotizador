import { prisma } from '@/lib/db';
import { ok, bad, actorFrom } from '@/lib/api';
import { logHistory } from '@/lib/history';

export const dynamic = 'force-dynamic';

// POST /api/quotes/:id/approve  body: { approve: bool }
// El gerente aprueba (bloquea) o desbloquea el precio final.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const actor = actorFrom(body, req.headers);

  if (actor.role !== 'gerente') {
    return bad('Solo el rol Gerente puede aprobar o desbloquear.', 403);
  }

  const q = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!q) return bad('Cotización no encontrada.', 404);

  const approve = body.approve !== false;
  const updated = await prisma.quote.update({
    where: { id: params.id },
    data: approve
      ? {
          approved: true,
          approvedBy: `${actor.name} (gerente)`,
          approvedAt: new Date(),
          status: 'aprobada',
          markupClosed: true,
        }
      : {
          approved: false,
          approvedBy: null,
          approvedAt: null,
          status: 'en_proceso',
        },
  });

  await logHistory({
    quoteId: params.id,
    userName: actor.name,
    userRole: actor.role,
    section: 'markup',
    action: approve ? 'aprobar' : 'reabrir',
    detail: approve
      ? `Aprobó y bloqueó el precio final.`
      : `Desbloqueó la cotización para editar.`,
  });

  return ok(updated);
}
