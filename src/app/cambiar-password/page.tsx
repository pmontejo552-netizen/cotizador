'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';

// Cambio de contraseña. Si el usuario entró con una contraseña TEMPORAL, el sistema
// lo trae acá y lo obliga a cambiarla antes de seguir (useMe redirige a esta página).
export default function CambiarPassword() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) return setErr('La nueva contraseña debe tener al menos 8 caracteres.');
    if (next !== confirm) return setErr('Las contraseñas no coinciden.');
    setBusy(true);
    setErr('');
    try {
      await api('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword: current, newPassword: next },
      });
      router.replace('/');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-bold">Cambiá tu contraseña</h1>
          <p className="text-sm text-slate-500">
            Antes de continuar, reemplazá la contraseña temporal por una propia.
          </p>
        </div>
        <div>
          <label className="label">Contraseña actual (la temporal)</label>
          <input type="password" className="inp" value={current} onChange={(e) => setCurrent(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="label">Nueva contraseña (mín. 8)</label>
          <input type="password" className="inp" value={next} onChange={(e) => setNext(e.target.value)} required />
        </div>
        <div>
          <label className="label">Repetir nueva contraseña</label>
          <input type="password" className="inp" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Guardando…' : 'Cambiar y continuar'}
        </button>
      </form>
    </main>
  );
}
