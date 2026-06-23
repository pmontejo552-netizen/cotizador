import { prisma } from '@/lib/db';
import { ok, bad, actorFrom, loadQuote, refreshStatus } from '@/lib/api';
import { logHistory } from '@/lib/history';

export const dynamic = 'force-dynamic';

// GET /api/quotes/:id  -> cotización completa (polling la usa)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const quote = await loadQuote(params.id);
  if (!quote) return bad('Cotización no encontrada.', 404);
  return ok(quote);
}

// Campos del encabezado / configuración editables.
const HEADER_FIELDS = [
  'number',
  'jobName',
  'client',
  'companyName',
  'currency',
  'ivaPct',
  'wastePct',
  'contingencyPct',
  'estimateSafetyPct',
  'estimatedDays',
  'includeAttachmentsInPdf',
];

// PATCH /api/quotes/:id -> edita encabezado / % configurables / markup (gerente)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const actor = actorFrom(body, req.headers);

  const quote = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!quote) return bad('Cotización no encontrada.', 404);
  if (quote.approved && body._force !== true) {
    return bad('La cotización está aprobada (bloqueada). Desbloqueala para editar.', 409);
  }

  const data: Record<string, unknown> = {};
  for (const f of HEADER_FIELDS) {
    if (f in body) data[f] = body[f];
  }

  // markup y margen: SOLO el gerente. El sistema convierte entre los dos.
  let markupChanged = false;
  if ('markupPct' in body || 'targetMarginPct' in body) {
    if (actor.role !== 'gerente') {
      return bad('Solo el rol Gerente puede editar el markup/margen.', 403);
    }
    if ('targetMarginPct' in body) {
      const m = parseFloat(String(body.targetMarginPct));
      // markup = margen / (1 - margen/100)
      data.markupPct = m >= 100 ? quote.markupPct : (m / (1 - m / 100)) || 0;
    } else {
      data.markupPct = parseFloat(String(body.markupPct)) || 0;
    }
    data.markupLastBy = `${actor.name} (${actor.role})`;
    markupChanged = true;
  }

  const updated = await prisma.quote.update({ where: { id: params.id }, data });

  await logHistory({
    quoteId: params.id,
    userName: actor.name,
    userRole: actor.role,
    section: markupChanged ? 'markup' : 'general',
    action: 'editar',
    detail: markupChanged
      ? `Ajustó el markup a ${Number(data.markupPct).toFixed(2)}%.`
      : `Editó el encabezado/configuración.`,
  });

  return ok(updated);
}

// DELETE /api/quotes/:id
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const quote = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!quote) return bad('Cotización no encontrada.', 404);
  await prisma.quote.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}
