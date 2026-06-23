import { prisma } from '../db';
import { askClaudeJSON, hasClaudeKey } from '../anthropic';
import { round2 } from '../calc';

export interface EstimateResult {
  unitPrice: number;
  source: 'history' | 'claude';
  basePrice: number; // antes del margen de seguridad
  note: string;
}

/**
 * Propone un precio estimado para un material sin precio.
 * Prioriza datos propios: busca primero en cotizaciones anteriores un material
 * igual o parecido. Si no hay nada en el historial, usa Claude.
 * Al precio base se le suma el margen de seguridad (safetyPct).
 */
export async function estimatePrice(args: {
  quoteId: string;
  description: string;
  itemType?: string | null;
  unit?: string | null;
  safetyPct: number;
}): Promise<EstimateResult> {
  const { description, itemType, unit, safetyPct } = args;

  // 1) Buscar en el historial de la empresa (otras cotizaciones).
  const hist = await findInHistory(args.quoteId, description, unit);
  if (hist) {
    const base = hist.unitPrice;
    return {
      basePrice: round2(base),
      unitPrice: round2(base * (1 + safetyPct / 100)),
      source: 'history',
      note: `Basado en "${hist.description}" de una cotización anterior (Q ${base.toFixed(
        2,
      )}) + ${safetyPct}% de seguridad.`,
    };
  }

  // 2) Sin historial: usar Claude.
  if (!hasClaudeKey()) {
    throw new Error(
      'No hay precio en el historial y falta ANTHROPIC_API_KEY para estimar con Claude.',
    );
  }

  // Contexto: precios históricos de la empresa (muestra) para anclar a Claude.
  const context = await sampleHistory(args.quoteId, 60);

  const system = `Eres un estimador de precios de materiales de construcción en Guatemala.
Estimás el precio unitario más probable (en Quetzales, sin IVA) para un material,
dándole prioridad a los precios históricos de la empresa que te paso como contexto.
Devolvé SOLO JSON: {"unitPrice": number, "note": string}. La nota explica brevemente
en qué te basaste. No inventes precios irreales.`;

  const user = `Material a estimar:
- Descripción: ${description}
- Tipo: ${itemType || '(no especificado)'}
- Unidad: ${unit || '(no especificada)'}

Precios históricos de la empresa (referencia):
${context.length ? JSON.stringify(context) : '(sin historial disponible)'}

Devolvé el precio unitario estimado en Q.`;

  const r = await askClaudeJSON<{ unitPrice: number; note: string }>({
    system,
    user,
    maxTokens: 1024,
  });

  const base = Number(r.unitPrice) || 0;
  return {
    basePrice: round2(base),
    unitPrice: round2(base * (1 + safetyPct / 100)),
    source: 'claude',
    note: `${r.note || 'Estimado por Claude.'} (+${safetyPct}% de seguridad)`,
  };
}

// Busca el material por coincidencia de descripción en OTRAS cotizaciones que
// tengan precio real (no estimado). Coincidencia simple por similitud de texto.
async function findInHistory(
  quoteId: string,
  description: string,
  unit?: string | null,
): Promise<{ description: string; unitPrice: number } | null> {
  const candidates = await prisma.lineItem.findMany({
    where: {
      kind: 'material',
      quoteId: { not: quoteId },
      isEstimated: false,
      unitPrice: { gt: 0 },
    },
    select: { description: true, unit: true, unitPrice: true },
    take: 2000,
    orderBy: { createdAt: 'desc' },
  });

  const target = normalize(description);
  let best: { description: string; unitPrice: number; score: number } | null = null;
  for (const c of candidates) {
    const score = similarity(target, normalize(c.description));
    const unitBonus = unit && c.unit && normalize(unit) === normalize(c.unit) ? 0.05 : 0;
    const total = score + unitBonus;
    if (!best || total > best.score) {
      best = { description: c.description, unitPrice: c.unitPrice, score: total };
    }
  }
  // Umbral de aceptación de coincidencia.
  if (best && best.score >= 0.55) {
    return { description: best.description, unitPrice: best.unitPrice };
  }
  return null;
}

async function sampleHistory(quoteId: string, take: number) {
  const items = await prisma.lineItem.findMany({
    where: {
      kind: 'material',
      quoteId: { not: quoteId },
      isEstimated: false,
      unitPrice: { gt: 0 },
    },
    select: { description: true, unit: true, unitPrice: true, itemType: true },
    take,
    orderBy: { createdAt: 'desc' },
  });
  return items.map((i) => ({
    description: i.description,
    tipo: i.itemType,
    unidad: i.unit,
    precio: i.unitPrice,
  }));
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Similitud por solapamiento de palabras (Jaccard) — simple y suficiente.
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const sa = new Set(a.split(' ').filter(Boolean));
  const sb = new Set(b.split(' ').filter(Boolean));
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}
