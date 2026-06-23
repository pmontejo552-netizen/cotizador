import { prisma } from '@/lib/db';
import { ok, bad } from '@/lib/api';
import { getSessionUser, verifyPassword, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/auth/change-password  { currentPassword, newPassword }
// El usuario autenticado cambia su propia contraseña.
export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return bad('No autenticado.', 401);

  const body = await req.json().catch(() => ({}));
  const current = String(body.currentPassword || '');
  const next = String(body.newPassword || '');
  if (next.length < 8) return bad('La nueva contraseña debe tener al menos 8 caracteres.');

  const user = await prisma.user.findUnique({ where: { id: me.id } });
  if (!user) return bad('Usuario no encontrado.', 404);

  const okPass = await verifyPassword(current, user.passwordHash);
  if (!okPass) return bad('La contraseña actual no es correcta.', 403);

  // Al cambiarla, se limpia la marca de "contraseña temporal".
  await prisma.user.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false },
  });
  return ok({ ok: true });
}
