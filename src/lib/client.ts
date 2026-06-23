'use client';

import { useEffect, useState } from 'react';
import type { Actor } from './types';

const KEY = 'cotizador_actor';

// Identidad del usuario (sin login): nombre + rol, recordados en el navegador.
export function useActor(): [Actor | null, (a: Actor) => void] {
  const [actor, setActorState] = useState<Actor | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setActorState(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const setActor = (a: Actor) => {
    setActorState(a);
    try {
      localStorage.setItem(KEY, JSON.stringify(a));
    } catch {
      /* ignore */
    }
  };

  return [actor, setActor];
}

export function readActor(): Actor {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { name: 'Desconocido', role: 'general' };
}

// fetch con cabeceras de actor y manejo de errores en español.
export async function api<T = any>(
  url: string,
  opts: { method?: string; body?: any; actor?: Actor; raw?: boolean } = {},
): Promise<T> {
  const actor = opts.actor ?? readActor();
  const headers: Record<string, string> = {
    'x-actor-name': encodeURIComponent(actor.name),
    'x-actor-role': actor.role,
  };

  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) {
    body = opts.body;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({ ...opts.body, _actorName: actor.name, _actorRole: actor.role });
  }

  const res = await fetch(url, { method: opts.method ?? 'GET', headers, body, cache: 'no-store' });
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

// El header x-actor-name viene URL-encoded; el backend lo decodifica aquí si hace falta.
export function decodeHeaderName(s: string | null): string {
  if (!s) return '';
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
