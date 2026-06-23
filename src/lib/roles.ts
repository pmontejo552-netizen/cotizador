// Roles del sistema (sin nombres de personas fijos). Lista configurable.
export const ROLES = [
  { id: 'materiales', label: 'Materiales', desc: 'Ingresa materiales: descripción, tipo, unidad y cantidad.' },
  { id: 'precios', label: 'Precios', desc: 'Sube el Excel de precios o edita los precios a mano.' },
  { id: 'tiempos', label: 'Tiempos', desc: 'Ingresa mano de obra y el tiempo estimado de obra.' },
  { id: 'otros', label: 'Otros costos', desc: 'Ingresa transporte, imprevistos, equipo, etc.' },
  { id: 'gerente', label: 'Gerente', desc: 'Define el markup/margen, revisa y aprueba el precio final.' },
] as const;

export type RoleId = (typeof ROLES)[number]['id'];

export function roleLabel(id: string): string {
  return ROLES.find((r) => r.id === id)?.label ?? id;
}

export function isManager(role: string): boolean {
  return role === 'gerente';
}
