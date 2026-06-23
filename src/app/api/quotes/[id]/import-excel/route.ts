import { bad, ok } from '@/lib/api';
import { hasClaudeKey } from '@/lib/anthropic';
import { parseExcelWithClaude, parseOtrosExcelWithClaude } from '@/lib/claude/excel';
import { MAX_FILE_BYTES, ALLOWED_EXCEL_TYPES } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/quotes/:id/import-excel  (multipart: file)
// Lee el Excel con Claude y DEVUELVE la vista previa (no toca la base de datos).
// El usuario revisa y luego confirma con /import-excel/apply.
export async function POST(req: Request) {
  if (!hasClaudeKey()) {
    return bad('Falta ANTHROPIC_API_KEY en el servidor para leer el Excel con Claude.', 503);
  }

  const form = await req.formData();
  const file = form.get('file');
  const target = String(form.get('target') || 'materiales');
  if (!(file instanceof File)) return bad('No se recibió ningún archivo.');
  if (file.size > MAX_FILE_BYTES) return bad('El archivo supera el límite de 12 MB.');

  const okType =
    ALLOWED_EXCEL_TYPES.includes(file.type) || /\.(xlsx|xls)$/i.test(file.name);
  if (!okType) return bad('Subí un archivo Excel (.xlsx o .xls).');

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const items =
      target === 'otros'
        ? await parseOtrosExcelWithClaude(buf)
        : await parseExcelWithClaude(buf);
    return ok({ items, count: items.length, target });
  } catch (e) {
    return bad(e instanceof Error ? e.message : 'No se pudo leer el Excel.', 500);
  }
}
