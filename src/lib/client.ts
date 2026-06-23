'use client';

import { useEffect, useState } from 'react';

export interface Me {
  id: string;
  name: string;
  email: string;
  role: string;
}

// fetch con manejo de errores en español. La identidad viaja en la cookie de
// sesión (httpOnly); ya no se mandan nombres a mano. Un 401 manda al login.
export async function api<T = any>(
  url: string,
  opts: { method?: string; body?: any; raw?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) {
    body = opts.body;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, { method: opts.method ?? 'GET', headers, body, cache: 'no-store' });

  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.href = '/login';
    throw new Error('No autenticado.');
  }
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (opts.raw) return res as unknown as T;
  return (await res.json()) as T;
}

// Usuario autenticado actual.
export function useMe(): { me: Me | null; loading: boolean } {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<Me>('/api/auth/me')
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);
  return { me, loading };
}

export async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    /* ignore */
  }
  window.location.href = '/login';
}
