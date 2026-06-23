import { prisma } from '@/lib/db';
import { ok, bad, actorFrom, refreshStatus } from '@/lib/api';
import { logHistory } from '@/lib/history';

export const dynamic = 'force-dynamic';

// POST /api/quotes/:id/import-excel/apply
// body: { items: [{description,itemType,unit,quantity,unitPrice}], mode: 'create'|'prices' }
// 'create' -> crea renglones nuevos (o actualiza precio si ya existe por descripción)
// 'prices' -> solo actualiza precios de materiales existentes que coincidan
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const actor = actorFrom(body, req.headers);
  const incoming: any[] = Array.isArray(body.items) ? body.items : [];
  const mode = body.mode === 'prices' ? 'prices' : 'create';
  const target = body.target === 'otros' ? 'otros' : 'materiales';

  const q = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!q) return bad('Cotización no encontrada.', 404);
  if (q.approved) return bad('Cotización aprobada (bloqueada).', 409);

  // --- Otros costos: crea renglones "other" (concepto + monto) ---
  if (target === 'otros') {
    const existingOther = await prisma.lineItem.findMany({
      where: { quoteId: params.id, kind: 'other' },
    });
    let pos = existingOther.reduce((m, e) => Math.max(m, e.position), -1) + 1;
    let createdOther = 0;
    for (const row of incoming) {
      const desc = String(row.description || '').trim();
      if (!desc) continue;
      await prisma.lineItem.create({
        data: {
          quoteId: params.id,
          kind: 'other',
          description: desc,
          amount: numOr(row.amount, 0),
          position: pos++,
        },
      });
      createdOther++;
    }
    await prisma.quote.update({
      where: { id: params.id },
      data: { otherLastBy: `${actor.name} (${actor.role})` },
    });
    await logHistory({
      quoteId: params.id,
      userName: actor.name,
      userRole: actor.role,
      section: 'otros',
      action: 'importar',
      detail: `Importó Excel de otros costos: ${createdOther} conceptos.`,
    });
    await refreshStatus(params.id);
    return ok({ created: createdOther, updated: 0 });
  }

  const existing = await prisma.lineItem.findMany({
    where: { quoteId: params.id, kind: 'material' },
  });
  const byDesc = new Map(existing.map((e) => [norm(e.description), e]));

  let created = 0;
  let updated = 0;
  let pos = existing.reduce((m, e) => Math.max(m, e.position), -1) + 1;

  for (const row of incoming) {
    const desc = String(row.description || '').trim();
    if (!desc) continue;
    const match = byDesc.get(norm(desc));

    if (match) {
      // Actualiza precio (y cantidad/unidad si vienen y mode=create)
      const data: any = {};
      if (row.unitPrice != null && isFinite(Number(row.unitPrice))) {
        data.unitPrice = Number(row.unitPrice);
        data.isEstimated = false;
        data.noPrice = false;
      }
      if (mode === 'create') {
        if (row.unit) data.unit = String(row.unit);
        if (row.itemType) data.itemType = String(row.itemType);
        if (row.quantity != null && isFinite(Number(row.quantity)))
          data.quantity = Number(row.quantity);
      }
      if (Object.keys(data).length) {
        await prisma.lineItem.update({ where: { id: match.id }, data });
        updated++;
      }
    } else if (mode === 'create') {
      await prisma.lineItem.create({
        data: {
          quoteId: params.id,
          kind: 'material',
          description: desc,
          itemType: row.itemType ? String(row.itemType) : null,
          unit: row.unit ? String(row.unit) : null,
          quantity: numOr(row.quantity, 0),
          unitPrice: numOr(row.unitPrice, 0),
          position: pos++,
        },
      });
      created++;
    }
  }

  // Marca quién subió/actualizó los precios por última vez.
  await prisma.quote.update({
    where: { id: params.id },
    data: { pricesLastBy: `${actor.name} (${actor.role})` },
  });

  await logHistory({
    quoteId: params.id,
    userName: actor.name,
    userRole: actor.role,
    section: mode === 'prices' ? 'precios' : 'materiales',
    action: 'importar',
    detail: `Importó Excel: ${created} renglones nuevos, ${updated} actualizados.`,
  });
  await refreshStatus(params.id);
  return ok({ created, updated });
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}
function numOr(v: unknown, d: number): number {
  const n = parseFloat(String(v));
  return isFinite(n) ? n : d;
}
