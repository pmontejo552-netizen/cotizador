import * as XLSX from 'xlsx';
import { askClaudeJSON } from '../anthropic';

export interface ParsedMaterial {
  description: string;
  itemType: string | null;
  unit: string | null;
  quantity: number | null;
  unitPrice: number | null;
}

/**
 * Lee un Excel (.xlsx/.xls) y usa Claude para identificar las columnas
 * (descripción, tipo, unidad, cantidad, precio unitario) aunque vengan con
 * nombres distintos, devolviendo los renglones en JSON estructurado.
 */
export async function parseExcelWithClaude(buf: Buffer): Promise<ParsedMaterial[]> {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('El Excel no tiene hojas.');
  const sheet = wb.Sheets[sheetName];

  // Filas como matriz (incluye encabezados). Limitamos para no exceder tokens.
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    blankrows: false,
  });

  if (rows.length === 0) throw new Error('El Excel está vacío.');

  const sample = rows.slice(0, 200); // hasta 200 filas

  const system = `Eres un asistente que normaliza tablas de precios de materiales de construcción (Guatemala).
Recibes filas crudas de un Excel (la primera fila suele ser encabezado, pero no siempre).
Tu tarea: identificar qué columna corresponde a cada campo, aunque los nombres varíen
(ej. "Descripción", "Material", "Detalle" -> description; "P.U.", "Precio", "Costo" -> unitPrice;
"Cant", "Cantidad" -> quantity; "Unidad", "U/M", "Med" -> unit; "Tipo", "Categoría" -> itemType).
Devuelve SOLO JSON válido, sin texto adicional, con esta forma:
{"items":[{"description":string,"itemType":string|null,"unit":string|null,"quantity":number|null,"unitPrice":number|null}]}
Reglas:
- Omite filas de encabezado, totales, subtotales o filas vacías.
- description es obligatoria; si una fila no tiene descripción clara, omítela.
- Convierte precios y cantidades a número (quita símbolos Q, $, comas de miles).
- Si un valor no existe, usa null.`;

  const user = `Filas del Excel (formato matriz, cada elemento es una fila):
${JSON.stringify(sample)}

Devolvé el JSON con los materiales detectados.`;

  const result = await askClaudeJSON<{ items: ParsedMaterial[] }>({
    system,
    user,
    maxTokens: 8000,
  });

  const items = Array.isArray(result.items) ? result.items : [];
  // Saneamiento básico
  return items
    .filter((i) => i && typeof i.description === 'string' && i.description.trim() !== '')
    .map((i) => ({
      description: String(i.description).trim(),
      itemType: i.itemType ? String(i.itemType).trim() : null,
      unit: i.unit ? String(i.unit).trim() : null,
      quantity: numOrNull(i.quantity),
      unitPrice: numOrNull(i.unitPrice),
    }));
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : null;
}
