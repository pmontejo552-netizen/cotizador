import { prisma } from '@/lib/db';
import { ok, bad, actorFrom } from '@/lib/api';
import { logHistory } from '@/lib/history';

export const dynamic = 'force-dynamic';

// GET /api/quotes  -> lista para el tablero (con avance y precio final calculado)
export async function GET() {
  const quotes = await prisma.quote.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { items: true },
  });
  return ok(quotes);
}

// POST /api/quotes -> crea una cotización nueva
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const actor = actorFrom(body, req.headers);

  if (!body.jobName || !body.client) {
    return bad('Faltan datos: nombre del trabajo y cliente son obligatorios.');
  }

  // Genera N.º consecutivo simple: COT-AÑO-#### según conteo existente.
  const year = new Date().getFullYear();
  const count = await prisma.quote.count();
  const number = body.number || `COT-${year}-${String(count + 1).padStart(4, '0')}`;

  const quote = await prisma.quote.create({
    data: {
      number,
      jobName: String(body.jobName),
      client: String(body.client),
      companyName: body.companyName || 'Mi Empresa',
      currency: body.currency === 'USD' ? 'USD' : 'GTQ',
      ivaPct: numOr(body.ivaPct, 12),
      wastePct: numOr(body.wastePct, 5),
      contingencyPct: numOr(body.contingencyPct, 5),
      markupPct: numOr(body.markupPct, 30),
      estimateSafetyPct: numOr(body.estimateSafetyPct, 12),
    },
  });

  await logHistory({
    quoteId: quote.id,
    userName: actor.name,
    userRole: actor.role,
    section: 'general',
    action: 'crear',
    detail: `Creó la cotización ${quote.number} (${quote.jobName}).`,
  });

  return ok(quote, { status: 201 });
}

function numOr(v: unknown, d: number): number {
  const n = parseFloat(String(v));
  return isFinite(n) ? n : d;
}
