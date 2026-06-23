import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ok, bad, requireUser, forbidden, loadQuote } from '@/lib/api';
import { canEditSection, canEditMarkup, isAdmin } from '@/lib/permissions';
import { logHistory } from '@/lib/history';

export const dynamic = 'force-dynamic';

// GET /api/quotes/:id  -> cotización completa (cualquier usuario autenticado).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const quote = await loadQuote(params.id);
  if (!quote) return bad('Cotización no encontrada.', 404);
  return ok(quote);
}

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

// PATCH /api/quotes/:id -> edita encabezado/consolidación (gerente) o markup (gerente).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const body = await req.json().catch(() => ({}));
  const quote = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!quote) return bad('Cotización no encontrada.', 404);
  if (quote.approved && body._force !== true) {
    return bad('La cotización está aprobada (bloqueada). Desbloqueala para editar.', 409);
  }

  const wantsMarkup = 'markupPct' in body || 'targetMarginPct' in body;
  const wantsHeader = HEADER_FIELDS.some((f) => f in body);

  // Permisos por servidor:
  if (wantsMarkup && !canEditMarkup(user.role)) {
    return forbidden('Solo el Gerente puede editar el markup/margen.');
  }
  if (wantsHeader && !canEditSection(user.role, 'general')) {
    return forbidden('Tu rol no puede editar el encabezado/configuración.');
  }

  const data: Record<string, unknown> = {};
  for (const f of HEADER_FIELDS) {
    if (f in body) data[f] = body[f];
  }

  let markupChanged = false;
  if (wantsMarkup) {
    if ('targetMarginPct' in body) {
      const m = parseFloat(String(body.targetMarginPct));
      data.markupPct = m >= 100 ? quote.markupPct : (m / (1 - m / 100)) || 0;
    } else {
      data.markupPct = parseFloat(String(body.markupPct)) || 0;
    }
    data.markupLastBy = `${user.name} (${user.role})`;
    markupChanged = true;
  }

  const updated = await prisma.quote.update({ where: { id: params.id }, data });

  await logHistory({
    quoteId: params.id,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    section: markupChanged ? 'markup' : 'general',
    action: 'editar',
    detail: markupChanged
      ? `Ajustó el markup a ${Number(data.markupPct).toFixed(2)}%.`
      : `Editó el encabezado/configuración.`,
  });

  return ok(updated);
}

// DELETE /api/quotes/:id -> solo Admin o Gerente.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!(isAdmin(user.role) || user.role === 'gerente')) {
    return forbidden('Solo Admin o Gerente pueden borrar cotizaciones.');
  }
  const quote = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!quote) return bad('Cotización no encontrada.', 404);
  await prisma.quote.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}
