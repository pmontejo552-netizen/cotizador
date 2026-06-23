import { prisma } from '@/lib/db';
import { ok, bad } from '@/lib/api';
import { hashPassword, signSession, setSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/auth/setup  { name, email, password }
// Pantalla de configuración inicial: crea el PRIMER admin. Solo funciona mientras
// no exista ningún usuario; apenas hay uno, queda desactivada para siempre (409).
export async function POST(req: Request) {
  const count = await prisma.user.count();
  if (count > 0) {
    return bad('La configuración inicial ya se completó. Iniciá sesión normalmente.', 409);
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!name || !email) return bad('Nombre y correo son obligatorios.');
  if (password.length < 8) return bad('La contraseña debe tener al menos 8 caracteres.');

  const admin = await prisma.user.create({
    data: {
      name,
      email,
      role: 'admin',
      passwordHash: await hashPassword(password),
      mustChangePassword: false, // el admin eligió su propia contraseña
    },
  });

  // Lo deja logueado.
  const token = await signSession({ uid: admin.id, role: admin.role, name: admin.name });
  await setSessionCookie(token);

  return ok({ id: admin.id, name: admin.name, email: admin.email, role: admin.role }, { status: 201 });
}
