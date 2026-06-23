import { NextResponse } from 'next/server';
import { prisma } from './db';
import { getSessionUser, type SessionUser } from './auth';

// Helpers compartidos por las rutas API.

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export type { SessionUser };

// Devuelve el usuario autenticado, o una respuesta 401/403 si no hay sesión.
// Uso: const user = await requireUser(); if (user instanceof NextResponse) return user;
export async function requireUser(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return bad('No autenticado.', 401);
  return user;
}

// Verifica una condición de permiso; devuelve 403 si no la cumple.
export function forbidden(message = 'No tenés permiso para esta acción.') {
  return bad(message, 403);
}

// Carga una cotización completa (items ordenados + adjuntos).
export async function loadQuote(id: string) {
  return prisma.quote.findUnique({
    where: { id },
    include: {
      items: { orderBy: { position: 'asc' } },
      attachments: { orderBy: { createdAt: 'desc' } },
    },
  });
}

// Recalcula el estado general según secciones cerradas / aprobación.
export function deriveStatus(q: {
  approved: boolean;
  materialsClosed: boolean;
  laborClosed: boolean;
  otherClosed: boolean;
  markupClosed: boolean;
}): string {
  if (q.approved) return 'aprobada';
  const any = q.materialsClosed || q.laborClosed || q.otherClosed || q.markupClosed;
  return any ? 'en_proceso' : 'borrador';
}

// Marca quién tocó por última vez una sección (según el tipo de renglón).
export async function touchSection(
  quoteId: string,
  kind: string,
  actor: { name: string; role: string },
) {
  const who = `${actor.name} (${actor.role})`;
  const field =
    kind === 'material' ? 'materialsLastBy' : kind === 'labor' ? 'laborLastBy' : 'otherLastBy';
  await prisma.quote.update({ where: { id: quoteId }, data: { [field]: who } });
}

export async function refreshStatus(id: string) {
  const q = await prisma.quote.findUnique({ where: { id } });
  if (!q) return;
  const status = deriveStatus(q);
  if (status !== q.status) {
    await prisma.quote.update({ where: { id }, data: { status } });
  }
}
