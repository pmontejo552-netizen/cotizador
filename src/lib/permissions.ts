// Permisos del sistema. TODO se valida en el servidor con estas funciones.
// El frontend solo las usa para esconder botones (cosmético); la verdad está acá.

export type Section =
  | 'materiales'
  | 'precios'
  | 'mano_obra'
  | 'otros'
  | 'markup'
  | 'consolidacion'
  | 'general';

// Qué sección puede editar cada rol de sección.
const ROLE_SECTION: Record<string, Section | null> = {
  materiales: 'materiales',
  precios: 'precios',
  tiempos: 'mano_obra',
  otros: 'otros',
  gerente: 'markup',
};

export function isAdmin(role: string): boolean {
  return role === 'admin';
}
export function isReadOnly(role: string): boolean {
  return role === 'lectura';
}

// ¿Puede editar esta sección?
export function canEditSection(role: string, section: Section): boolean {
  if (role === 'admin') return true;
  if (role === 'lectura') return false;
  // El encabezado y la consolidación (%, datos generales) los maneja el gerente.
  if (section === 'general' || section === 'consolidacion') return role === 'gerente';
  if (section === 'markup') return role === 'gerente';
  return ROLE_SECTION[role] === section;
}

// Markup/margen y aprobación: solo gerente (o admin como superusuario).
export function canEditMarkup(role: string): boolean {
  return role === 'gerente' || role === 'admin';
}
export function canApprove(role: string): boolean {
  return role === 'gerente' || role === 'admin';
}

// Crear/duplicar cotizaciones: cualquier rol que no sea solo lectura.
export function canCreateQuote(role: string): boolean {
  return role !== 'lectura';
}

// Administración de usuarios: solo admin.
export function canManageUsers(role: string): boolean {
  return role === 'admin';
}

// Subir Excel: el de materiales lo suben Materiales/Precios; el de otros, Otros.
export function canUploadExcel(role: string, target: 'materiales' | 'otros'): boolean {
  if (role === 'admin') return true;
  if (target === 'otros') return role === 'otros';
  return role === 'materiales' || role === 'precios';
}

// Adjuntos (planos/fotos): cualquier rol con permiso de edición (no solo lectura).
export function canUploadAttachment(role: string): boolean {
  return role !== 'lectura';
}

// Sección "dueña" de un tipo de renglón (para labor/otros). Materiales se decide
// según los campos editados (descripción->materiales, precio->precios).
export function sectionForKind(kind: string): Section {
  if (kind === 'labor') return 'mano_obra';
  if (kind === 'other') return 'otros';
  return 'materiales';
}

// Campos que pertenecen a la sección Precios cuando se edita un material.
const PRICE_FIELDS = ['unitPrice', 'isEstimated', 'noPrice', 'estimateSource', 'estimateNote'];

// Decide qué sección se requiere para editar un material según los campos del body.
export function sectionForMaterialEdit(body: Record<string, unknown>): Section {
  const keys = Object.keys(body).filter((k) => !k.startsWith('_'));
  const touchesPrice = keys.some((k) => PRICE_FIELDS.includes(k));
  const touchesDesc = keys.some((k) => ['description', 'itemType', 'unit', 'quantity'].includes(k));
  // Si toca precio (y no datos descriptivos), es del rol Precios.
  if (touchesPrice && !touchesDesc) return 'precios';
  return 'materiales';
}
