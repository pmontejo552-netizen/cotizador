import { prisma } from '@/lib/db';
import { ok, bad, actorFrom, refreshStatus, touchSection } from '@/lib/api';
import { logHistory } from '@/lib/history';

export const dynamic = 'force-dynamic';

const SECTION_BY_KIND: Record<string, string> = {
  material: 'materiales',
  labor: 'mano_obra',
  other: 'otros',
};

async function assertEditable(id: string) {
  const q = await prisma.quote.findUnique({ where: { id } });
  if (!q) return { error: bad('Cotización no encontrada.', 404) };
  if (q.approved) return { error: bad('Cotización aprobada (bloqueada).', 409) };
  return { quote: q };
}

// POST /api/quotes/:id/items -> agrega un renglón (material | labor | other)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const actor = actorFrom(body, req.headers);
  const { error } = await assertEditable(params.id);
  if (error) return error;

  const kind = ['material', 'labor', 'other'].includes(body.kind) ? body.kind : 'material';
  const last = await prisma.lineItem.findFirst({
    where: { quoteId: params.id, kind },
    orderBy: { position: 'desc' },
  });

  const item = await prisma.lineItem.create({
    data: {
      quoteId: params.id,
      kind,
      description: body.description || '',
      itemType: body.itemType ?? null,
      unit: body.unit ?? null,
      quantity: num(body.quantity, 0),
      unitPrice: num(body.unitPrice, 0),
      amount: kind === 'other' ? num(body.amount, 0) : null,
      position: (last?.position ?? -1) + 1,
    },
  });

  await touchSection(params.id, kind, actor);
  await logHistory({
    quoteId: params.id,
    userName: actor.name,
    userRole: actor.role,
    section: SECTION_BY_KIND[kind],
    action: 'crear',
    detail: `Agregó un renglón en ${SECTION_BY_KIND[kind]}.`,
  });
  await refreshStatus(params.id);
  return ok(item, { status: 201 });
}

function num(v: unknown, d: number): number {
  const n = parseFloat(String(v));
  return isFinite(n) ? n : d;
}
