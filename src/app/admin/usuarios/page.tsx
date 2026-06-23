'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import { ROLES } from '@/lib/roles';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export default function UsersAdmin() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ name: '', email: '', role: 'materiales', password: '' });
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setUsers(await api<UserRow[]>('/api/users'));
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    setBusy(true);
    setErr('');
    try {
      await api('/api/users', { method: 'POST', body: form });
      setForm({ name: '', email: '', role: 'materiales', password: '' });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, data: Record<string, unknown>) {
    try {
      await api(`/api/users/${id}`, { method: 'PATCH', body: data });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error');
    }
  }

  async function resetPassword(u: UserRow) {
    const pw = prompt(`Nueva contraseña para ${u.name} (mínimo 8 caracteres):`);
    if (!pw) return;
    await patch(u.id, { password: pw });
    alert('Contraseña actualizada.');
  }

  return (
    <main className="mx-auto max-w-3xl px-3 pb-24 pt-4 sm:px-4">
      <div className="mb-3">
        <Link href="/" className="text-sm text-marca hover:underline">
          ← Tablero
        </Link>
      </div>
      <h1 className="mb-1 text-xl font-bold">Usuarios</h1>
      <p className="mb-4 text-sm text-slate-500">
        Las cuentas las crea el administrador (sistema por invitación).
      </p>

      {err && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-600">{err}</p>}

      {/* Crear usuario */}
      <div className="card mb-4 space-y-3">
        <h2 className="font-bold">Nuevo usuario</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label className="label">Nombre</label>
            <input className="inp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Correo</label>
            <input className="inp" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Rol</label>
            <select className="inp" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Contraseña inicial (mín. 8)</label>
            <input className="inp" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
        </div>
        <button className="btn-primary" onClick={create} disabled={busy}>
          {busy ? 'Creando…' : 'Crear usuario'}
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="py-8 text-center text-slate-400">Cargando…</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="card flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {u.name} {!u.active && <span className="chip bg-red-100 text-red-700">Inactivo</span>}
                </p>
                <p className="truncate text-xs text-slate-500">{u.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="inp w-auto"
                  value={u.role}
                  onChange={(e) => patch(u.id, { role: e.target.value })}
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button className="btn-ghost" onClick={() => patch(u.id, { active: !u.active })}>
                  {u.active ? 'Desactivar' : 'Activar'}
                </button>
                <button className="btn-ghost" onClick={() => resetPassword(u)}>
                  Reiniciar contraseña
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
