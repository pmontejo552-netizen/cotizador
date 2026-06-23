// Roles del sistema. Cada usuario tiene un rol.
export const ROLES = [
  { id: 'admin', label: 'Admin', desc: 'Administra usuarios y puede ver/editar todo.' },
  { id: 'gerente', label: 'Gerente', desc: 'Define el markup/margen, revisa y aprueba el precio final.' },
  { id: 'materiales', label: 'Materiales', desc: 'Ingresa materiales: descripción, tipo, unidad y cantidad.' },
  { id: 'precios', label: 'Precios', desc: 'Sube el Excel de precios o edita los precios a mano.' },
  { id: 'tiempos', label: 'Tiempos', desc: 'Ingresa mano de obra y el tiempo estimado de obra.' },
  { id: 'otros', label: 'Otros costos', desc: 'Ingresa transporte, imprevistos, equipo, etc.' },
  { id: 'lectura', label: 'Solo lectura', desc: 'Puede ver las cotizaciones pero no editar nada.' },
] as const;

export type RoleId = (typeof ROLES)[number]['id'];

export const ROLE_IDS = ROLES.map((r) => r.id) as RoleId[];

export function roleLabel(id: string): string {
  return ROLES.find((r) => r.id === id)?.label ?? id;
}

export function isValidRole(id: string): id is RoleId {
  return ROLE_IDS.includes(id as RoleId);
}
