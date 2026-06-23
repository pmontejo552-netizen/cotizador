import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ok, bad, requireUser, forbidden } from '@/lib/api';
import { canManageUsers } from '@/lib/permissions';
import { isValidRole } from '@/lib/roles';
import { hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PATCH /api/users/:id -> edita rol/estado/nombre o reinicia contraseña (solo Admin).
// body: { name?, role?, active?, password? }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await requireUser();
  if (me instanceof NextResponse) return me;
  if (!canManageUsers(me.role)) return forbidden('Solo el Admin administra usuarios.');

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return bad('Usuario no encontrado.', 404);

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();

  if ('role' in body) {
    if (!isValidRole(String(body.role))) return bad('Rol inválido.');
    // No te quites tu propio rol de admin (evita quedarte afuera).
    if (target.id === me.id && body.role !== 'admin') {
      return bad('No podés cambiar tu propio rol de admin.', 409);
    }
    data.role = String(body.role);
  }

  if ('active' in body) {
    // No te desactives a vos mismo.
    if (target.id === me.id && body.active === false) {
      return bad('No podés desactivar tu propia cuenta.', 409);
    }
    data.active = Boolean(body.active);
  }

  if ('password' in body) {
    const pw = String(body.password || '');
    if (pw.length < 8) return bad('La contraseña debe tener al menos 8 caracteres.');
    data.passwordHash = await hashPassword(pw);
  }

  if (Object.keys(data).length === 0) return bad('Nada para actualizar.');

  const updated = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
  return ok(updated);
}
