import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ok, requireUser } from '@/lib/api';

export const dynamic = 'force-dynamic';

// GET /api/quotes/:id/history -> línea de tiempo (cualquier usuario autenticado).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const entries = await prisma.historyEntry.findMany({
    where: { quoteId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });
  return ok(entries);
}
