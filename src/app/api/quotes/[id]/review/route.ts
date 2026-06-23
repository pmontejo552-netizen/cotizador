import { bad, ok } from '@/lib/api';
import { reviewQuote } from '@/lib/claude/review';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/quotes/:id/review -> lista priorizada de cosas a revisar
// (reglas fijas + análisis de Claude). Informativo, no bloquea.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const result = await reviewQuote(params.id);
    return ok(result);
  } catch (e) {
    return bad(e instanceof Error ? e.message : 'No se pudo revisar.', 500);
  }
}
