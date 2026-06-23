'use client';

import { useState } from 'react';
import { ROLES } from '@/lib/roles';
import type { Actor } from '@/lib/types';

// Al abrir una cotización, la persona escribe su nombre y elige su rol.
// Queda recordado en el navegador y se usa para atribuir los cambios.
export function IdentityGate({
  actor,
  onSet,
}: {
  actor: Actor | null;
  onSet: (a: Actor) => void;
}) {
  const [name, setName] = useState(actor?.name && actor.name !== 'Desconocido' ? actor.name : '');
  const [role, setRole] = useState(actor?.role && actor.role !== 'general' ? actor.role : 'materiales');

  if (actor && actor.name && actor.name !== 'Desconocido') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5">
        <h2 className="text-lg font-bold">¿Quién sos?</h2>
        <p className="mb-4 text-sm text-slate-500">
          Para registrar tus cambios. Podés cambiarlo después.
        </p>
        <label className="label">Tu nombre</label>
        <input
          className="inp mb-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Juan Pérez"
          autoFocus
        />
        <label className="label">Tu rol</label>
        <select className="inp mb-1" value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <p className="mb-4 mt-1 text-xs text-slate-400">
          {ROLES.find((r) => r.id === role)?.desc}
        </p>
        <button
          className="btn-primary w-full"
          disabled={!name.trim()}
          onClick={() => onSet({ name: name.trim(), role })}
        >
          Entrar
        </button>
      </div>
    </div>
  );
}

// Barra superior compacta con la identidad y opción de cambiarla.
export function ActorBar({ actor, onChange }: { actor: Actor; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="chip bg-slate-100 text-slate-600 hover:bg-slate-200"
      title="Cambiar nombre o rol"
    >
      {actor.name} · {ROLES.find((r) => r.id === actor.role)?.label ?? actor.role} ✎
    </button>
  );
}
