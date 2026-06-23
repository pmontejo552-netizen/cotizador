import { prisma } from '@/lib/db';
import { ok, bad } from '@/lib/api';
import {
  hashPassword,
  verifyPassword,
  signSession,
  setSessionCookie,
  rateLimitLogin,
  clientIp,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/auth/login  { email, password }
// Incluye rate limit y el "bootstrap" del primer admin (ver README): si todavía
// no hay ningún usuario, las credenciales ADMIN_EMAIL/ADMIN_PASSWORD crean el admin.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  const ip = clientIp(req.headers);
  const rl = rateLimitLogin(`${ip}:${email}`);
  if (!rl.ok) {
    return bad(`Demasiados intentos. Probá de nuevo en ${Math.ceil(rl.retryAfterSec / 60)} min.`, 429);
  }

  if (!email || !password) return bad('Correo y contraseña son obligatorios.');

  const count = await prisma.user.count();

  // --- Bootstrap del primer administrador ---
  if (count === 0) {
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPass = process.env.ADMIN_PASSWORD || '';
    if (adminEmail && adminPass && email === adminEmail && password === adminPass) {
      const admin = await prisma.user.create({
        data: {
          name: process.env.ADMIN_NAME || 'Administrador',
          email: adminEmail,
          role: 'admin',
          passwordHash: await hashPassword(adminPass),
        },
      });
      await issueSession(admin.id, admin.role, admin.name);
      return ok({ id: admin.id, name: admin.name, email: admin.email, role: admin.role });
    }
    return bad('Credenciales inválidas.', 401);
  }

  // --- Login normal ---
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) return bad('Credenciales inválidas.', 401);
  const okPass = await verifyPassword(password, user.passwordHash);
  if (!okPass) return bad('Credenciales inválidas.', 401);

  await issueSession(user.id, user.role, user.name);
  return ok({ id: user.id, name: user.name, email: user.email, role: user.role });
}

async function issueSession(uid: string, role: string, name: string) {
  const token = await signSession({ uid, role, name });
  await setSessionCookie(token);
}
