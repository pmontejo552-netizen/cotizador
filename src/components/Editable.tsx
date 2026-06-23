'use client';

import { useEffect, useRef, useState } from 'react';

// Celda editable que guarda al perder el foco (onBlur). Re-sincroniza con el
// valor del servidor solo cuando NO está enfocada, para no pisar lo que escribís.
export function Cell({
  value,
  onSave,
  type = 'text',
  disabled = false,
  placeholder,
  className = '',
  align = 'left',
}: {
  value: string | number;
  onSave: (v: string) => void | Promise<void>;
  type?: 'text' | 'number';
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  align?: 'left' | 'right';
}) {
  const [local, setLocal] = useState(String(value ?? ''));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setLocal(String(value ?? ''));
  }, [value]);

  return (
    <input
      type={type}
      inputMode={type === 'number' ? 'decimal' : undefined}
      step={type === 'number' ? 'any' : undefined}
      disabled={disabled}
      placeholder={placeholder}
      className={`inp ${align === 'right' ? 'text-right' : ''} ${className}`}
      value={local}
      onFocus={() => (focused.current = true)}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        focused.current = false;
        if (String(value ?? '') !== local) onSave(local);
      }}
    />
  );
}
