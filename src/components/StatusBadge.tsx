export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    borrador: { label: 'Borrador', cls: 'bg-slate-100 text-slate-600' },
    en_proceso: { label: 'En proceso', cls: 'bg-amber-100 text-amber-700' },
    aprobada: { label: 'Aprobada', cls: 'bg-emerald-100 text-emerald-700' },
  };
  const s = map[status] ?? map.borrador;
  return <span className={`chip ${s.cls}`}>{s.label}</span>;
}

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-marca transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-medium text-slate-500">{pct}%</span>
    </div>
  );
}
