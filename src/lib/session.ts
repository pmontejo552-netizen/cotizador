// Lógica de sesión SEGURA PARA EDGE (solo usa `jose`, sin Node/Prisma/bcrypt).
// El middleware importa SOLO de acá para no arrastrar módulos de Node al edge.
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'cotizador_session';
export const SESSION_HOURS = 8;

export function secretKey(): Uint8Array {
  const s =
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV !== 'production'
      ? 'dev-only-insecure-secret-change-me-please-32chars'
      : '');
  if (!s) throw new Error('Falta SESSION_SECRET. Configurala como variable de entorno.');
  return new TextEncoder().encode(s);
}

export interface SessionPayload {
  uid: string;
  role: string;
  name: string;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secretKey());
}

// Verifica el token. Edge-compatible.
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.uid || !payload.role) return null;
    return {
      uid: String(payload.uid),
      role: String(payload.role),
      name: String(payload.name ?? ''),
    };
  } catch {
    return null;
  }
}
