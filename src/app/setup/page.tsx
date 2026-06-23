'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Pantalla de configuración inicial. Solo aparece mientras NO hay usuarios.
// Crea el primer Admin y se desactiva para siempre (si ya hay usuarios, manda al login).
export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/auth/setup-status')
      .then((r) => r.json())
      .then((d) => {
        if (!d.needsSetup) router.replace('/login');
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) return setErr('La contraseña debe tener al menos 8 caracteres.');
    if (form.password !== form.confirm) return setErr('Las contraseñas no coinciden.');
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'No se pudo crear el administrador.');
      }
      router.replace('/'); // queda logueado como admin
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
      setBusy(false);
    }
  }

  if (checking) return <p className="py-16 text-center text-slate-400">Cargando…</p>;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-bold">Configuración inicial</h1>
          <p className="text-sm text-slate-500">
            Creá el primer administrador. Esta pantalla se desactiva apenas exista un usuario.
          </p>
        </div>
        <div>
          <label className="label">Nombre</label>
          <input className="inp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
        </div>
        <div>
          <label className="label">Correo</label>
          <input type="email" className="inp" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div>
          <label className="label">Contraseña (mín. 8)</label>
          <input type="password" className="inp" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        <div>
          <label className="label">Repetir contraseña</label>
          <input type="password" className="inp" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Creando…' : 'Crear administrador'}
        </button>
      </form>
    </main>
  );
}
