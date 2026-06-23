import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ok, bad, requireUser, forbidden } from '@/lib/api';
import { canApprove } from '@/lib/permissions';
import { logHistory } from '@/lib/history';

export const dynamic = 'force-dynamic';

// POST /api/quotes/:id/approve  body: { approve: bool }
// Solo Gerente (o Admin) aprueba/desbloquea el precio final.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!canApprove(user.role)) {
    return forbidden('Solo el Gerente puede aprobar o desbloquear.');
  }

  const body = await req.json().catch(() => ({}));
  const q = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!q) return bad('Cotización no encontrada.', 404);

  const approve = body.approve !== false;
  const updated = await prisma.quote.update({
    where: { id: params.id },
    data: approve
      ? {
          approved: true,
          approvedBy: `${user.name} (${user.role})`,
          approvedAt: new Date(),
          status: 'aprobada',
          markupClosed: true,
        }
      : { approved: false, approvedBy: null, approvedAt: null, status: 'en_proceso' },
  });

  await logHistory({
    quoteId: params.id,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    section: 'markup',
    action: approve ? 'aprobar' : 'reabrir',
    detail: approve ? `Aprobó y bloqueó el precio final.` : `Desbloqueó la cotización para editar.`,
  });

  return ok(updated);
}
