import { prisma } from '@/lib/db';
import { ok, bad, actorFrom } from '@/lib/api';
import { logHistory } from '@/lib/history';

export const dynamic = 'force-dynamic';

const NOTE_FIELD: Record<string, string> = {
  materiales: 'materialsNote',
  precios: 'pricesNote',
  mano_obra: 'laborNote',
  otros: 'otherNote',
  consolidacion: 'consolidationNote',
  markup: 'markupNote',
};

// PATCH /api/quotes/:id/notes  body: { section, note }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const actor = actorFrom(body, req.headers);
  const field = NOTE_FIELD[String(body.section || '')];
  if (!field) return bad('Sección inválida.');

  const q = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!q) return bad('Cotización no encontrada.', 404);

  await prisma.quote.update({
    where: { id: params.id },
    data: { [field]: String(body.note ?? '') },
  });

  await logHistory({
    quoteId: params.id,
    userName: actor.name,
    userRole: actor.role,
    section: String(body.section),
    action: 'editar',
    detail: `Actualizó la nota de ${body.section}.`,
  });
  return ok({ ok: true });
}
