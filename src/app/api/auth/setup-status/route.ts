import { prisma } from '@/lib/db';
import { ok } from '@/lib/api';

export const dynamic = 'force-dynamic';

// GET /api/auth/setup-status -> { needsSetup }. Público.
// needsSetup = true solo mientras NO existe ningún usuario.
export async function GET() {
  const count = await prisma.user.count();
  return ok({ needsSetup: count === 0 });
}
