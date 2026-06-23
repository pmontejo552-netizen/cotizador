import { ok } from '@/lib/api';
import { clearSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/auth/logout -> cierra sesión (borra la cookie).
export async function POST() {
  clearSessionCookie();
  return ok({ ok: true });
}
