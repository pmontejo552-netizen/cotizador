import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ok, bad, requireUser, forbidden, refreshStatus, touchSection } from '@/lib/api';
import { canEditSection, sectionForKind } from '@/lib/permissions';
import { logHistory } from '@/lib/history';

export const dynamic = 'force-dynamic';

const SECTION_BY_KIND: Record<string, string> = {
  material: 'materiales',
  labor: 'mano_obra',
  other: 'otros',
};

// POST /api/quotes/:id/items -> agrega un renglón (material | labor | other)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const body = await req.json().catch(() => ({}));
  const kind = ['material', 'labor', 'other'].includes(body.kind) ? body.kind : 'material';

  // Permiso: cada rol agrega renglones solo en su sección.
  if (!canEditSection(user.role, sectionForKind(kind))) {
    return forbidden('Tu rol no puede agregar renglones en esta sección.');
  }

  const q = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!q) return bad('Cotización no encontrada.', 404);
  if (q.approved) return bad('Cotización aprobada (bloqueada).', 409);

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

  await touchSection(params.id, kind, user);
  await logHistory({
    quoteId: params.id,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
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
