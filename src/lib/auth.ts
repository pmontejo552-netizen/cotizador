import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './db';
import { SESSION_COOKIE, SESSION_HOURS, signSession, verifySession } from './session';

// Re-exporta lo de sesión para que el resto del código siga importando de '@/lib/auth'.
export { SESSION_COOKIE, signSession, verifySession };
export type { SessionPayload } from './session';

// --- Contraseñas (bcrypt, nunca texto plano) ---
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

// --- Cookie de sesión (en route handlers / server actions) ---
export async function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_HOURS * 3600,
  });
}
export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
}

// Usuario autenticado actual (lee la cookie, verifica el JWT y carga el usuario de
// la base para confirmar que sigue ACTIVO y con su rol vigente). null si no hay sesión.
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.uid } });
  if (!user || !user.active) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}

// --- Rate limit de login (en memoria; suficiente en una instancia única) ---
const attempts = new Map<string, number[]>();
const WINDOW_MS = 15 * 60 * 1000; // 15 min
const MAX_ATTEMPTS = 10;

export function rateLimitLogin(key: string): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const list = (attempts.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_ATTEMPTS) {
    const retry = Math.ceil((WINDOW_MS - (now - list[0])) / 1000);
    attempts.set(key, list);
    return { ok: false, retryAfterSec: retry };
  }
  list.push(now);
  attempts.set(key, list);
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(headers: Headers): string {
  return (headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}
