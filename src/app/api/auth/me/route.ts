import { ok, bad } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/auth/me -> usuario autenticado actual (para la UI).
export async function GET() {
  const user = await getSessionUser();
  if (!user) return bad('No autenticado.', 401);
  return ok(user);
}
