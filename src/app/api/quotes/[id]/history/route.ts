import { prisma } from '@/lib/db';
import { ok } from '@/lib/api';

export const dynamic = 'force-dynamic';

// GET /api/quotes/:id/history -> línea de tiempo de cambios
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const entries = await prisma.historyEntry.findMany({
    where: { quoteId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });
  return ok(entries);
}
