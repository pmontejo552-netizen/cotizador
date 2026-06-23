import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ok, bad, requireUser, forbidden } from '@/lib/api';
import { canManageUsers } from '@/lib/permissions';
import { isValidRole } from '@/lib/roles';
import { hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/users -> lista de usuarios (solo Admin). Nunca devuelve el hash.
export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!canManageUsers(user.role)) return forbidden('Solo el Admin administra usuarios.');

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
  return ok(users);
}

// POST /api/users -> crea un usuario (solo Admin). Sistema por invitación.
export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!canManageUsers(user.role)) return forbidden('Solo el Admin administra usuarios.');

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const role = String(body.role || '');
  const password = String(body.password || '');

  if (!name || !email) return bad('Nombre y correo son obligatorios.');
  if (!isValidRole(role)) return bad('Rol inválido.');
  if (password.length < 8) return bad('La contraseña debe tener al menos 8 caracteres.');

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return bad('Ya existe un usuario con ese correo.', 409);

  const created = await prisma.user.create({
    data: { name, email, role, passwordHash: await hashPassword(password) },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
  return ok(created, { status: 201 });
}
