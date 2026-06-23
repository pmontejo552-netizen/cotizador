import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

// Todo el sistema queda detrás del login. El middleware corre en cada request
// (excepto estáticos) y exige una sesión válida. Esto es la primera barrera;
// además cada endpoint vuelve a verificar el ROL del usuario (permisos finos).
const PUBLIC_PREFIXES = ['/login', '/api/auth/'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas públicas: login y endpoints de autenticación.
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const valid = token ? await verifySession(token) : null;

  if (!valid) {
    // Para la API: 401 JSON. Para páginas: redirige al login.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Aplica a todo menos estáticos de Next y archivos públicos.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
