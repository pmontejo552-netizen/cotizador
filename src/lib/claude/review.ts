import { prisma } from '../db';
import { askClaudeJSON, hasClaudeKey } from '../anthropic';
import { computeQuote } from '../calc';

export interface ReviewFlag {
  id: string;
  priority: 'alta' | 'media' | 'baja';
  title: string; // qué es
  reason: string; // por qué vale la pena revisarlo
  section: string; // a qué sección apunta
  itemRef?: string | null; // a qué renglón apunta (descripción)
  source: 'regla' | 'claude';
}

interface ItemLite {
  id: string;
  kind: string;
  description: string;
  itemType: string | null;
  unit: string | null;
  quantity: number;
  unitPrice: number;
  amount: number | null;
  isEstimated: boolean;
  noPrice: boolean;
}

/**
 * Botón "Revisar": combina reglas fijas (rápidas y seguras) con un análisis de
 * criterio de Claude. Es informativo: avisa, no bloquea.
 */
export async function reviewQuote(quoteId: string): Promise<{
  flags: ReviewFlag[];
  claudeUsed: boolean;
  claudeError?: string;
}> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { items: { orderBy: { position: 'asc' } } },
  });
  if (!quote) throw new Error('Cotización no encontrada.');

  const items = quote.items as unknown as ItemLite[];
  const flags: ReviewFlag[] = [...ruleChecks(items)];

  let claudeUsed = false;
  let claudeError: string | undefined;

  if (hasClaudeKey()) {
    try {
      const claudeFlags = await claudeChecks(quote, items);
      flags.push(...claudeFlags);
      claudeUsed = true;
    } catch (e) {
      claudeError = e instanceof Error ? e.message : 'Error al consultar Claude.';
    }
  }

  // Ordena por prioridad (alta primero).
  const order = { alta: 0, media: 1, baja: 2 };
  flags.sort((a, b) => order[a.priority] - order[b.priority]);
  return { flags, claudeUsed, claudeError };
}

// ---- Reglas fijas (sin IA) -------------------------------------------------
function ruleChecks(items: ItemLite[]): ReviewFlag[] {
  const flags: ReviewFlag[] = [];
  let n = 0;
  const fid = () => `regla-${n++}`;

  const materials = items.filter((i) => i.kind === 'material');
  const seen = new Map<string, number>();

  for (const it of items) {
    const sec = sectionOf(it.kind);

    // Sin precio o estimado (solo aplica a materiales/labor con precio)
    if (it.kind === 'material' || it.kind === 'labor') {
      if (it.noPrice || (!it.isEstimated && (it.unitPrice || 0) === 0)) {
        flags.push({
          id: fid(),
          priority: 'alta',
          title: 'Renglón sin precio',
          reason: 'Este renglón no tiene precio real. Conseguilo o marcalo como estimado antes de aprobar.',
          section: sec,
          itemRef: it.description || '(sin descripción)',
          source: 'regla',
        });
      } else if (it.isEstimated) {
        flags.push({
          id: fid(),
          priority: 'media',
          title: 'Precio estimado',
          reason: 'El precio es un estimado. Revisalo antes de cerrar el precio final.',
          section: sec,
          itemRef: it.description || '(sin descripción)',
          source: 'regla',
        });
      }
    }

    // Cantidad en cero (materiales y mano de obra)
    if ((it.kind === 'material' || it.kind === 'labor') && (it.quantity || 0) === 0) {
      flags.push({
        id: fid(),
        priority: 'media',
        title: 'Cantidad en cero',
        reason: 'La cantidad es 0, por lo que el renglón no suma. ¿Falta llenarla?',
        section: sec,
        itemRef: it.description || '(sin descripción)',
        source: 'regla',
      });
    }

    // Campos vacíos
    if (!it.description || it.description.trim() === '') {
      flags.push({
        id: fid(),
        priority: 'media',
        title: 'Descripción vacía',
        reason: 'Hay un renglón sin descripción.',
        section: sec,
        itemRef: null,
        source: 'regla',
      });
    }
    if (it.kind === 'material' && (!it.unit || it.unit.trim() === '')) {
      flags.push({
        id: fid(),
        priority: 'baja',
        title: 'Unidad vacía',
        reason: 'A este material le falta la unidad (ej. m, kg, saco).',
        section: sec,
        itemRef: it.description || '(sin descripción)',
        source: 'regla',
      });
    }
    if (it.kind === 'other' && (it.amount || 0) === 0) {
      flags.push({
        id: fid(),
        priority: 'baja',
        title: 'Otro costo en cero',
        reason: 'Este concepto de "otros costos" tiene monto 0.',
        section: 'otros',
        itemRef: it.description || '(sin descripción)',
        source: 'regla',
      });
    }
  }

  // Duplicados de materiales por descripción
  for (const m of materials) {
    const key = m.description.trim().toLowerCase();
    if (!key) continue;
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  for (const [key, count] of seen) {
    if (count > 1) {
      flags.push({
        id: fid(),
        priority: 'baja',
        title: 'Renglón duplicado',
        reason: `El material "${key}" aparece ${count} veces. ¿Es a propósito?`,
        section: 'materiales',
        itemRef: key,
        source: 'regla',
      });
    }
  }

  return flags;
}

function sectionOf(kind: string): string {
  if (kind === 'material') return 'materiales';
  if (kind === 'labor') return 'mano_obra';
  return 'otros';
}

// ---- Análisis de criterio con Claude ---------------------------------------
async function claudeChecks(
  quote: { id: string; markupPct: number; estimatedDays: number | null; wastePct: number; contingencyPct: number; ivaPct: number },
  items: ItemLite[],
): Promise<ReviewFlag[]> {
  const calc = computeQuote({
    items: items.map((i) => ({ kind: i.kind as any, quantity: i.quantity, unitPrice: i.unitPrice, amount: i.amount })),
    wastePct: quote.wastePct,
    contingencyPct: quote.contingencyPct,
    markupPct: quote.markupPct,
    ivaPct: quote.ivaPct,
  });

  // Contexto: precios históricos de la empresa.
  const history = await prisma.lineItem.findMany({
    where: { kind: 'material', quoteId: { not: quote.id }, isEstimated: false, unitPrice: { gt: 0 } },
    select: { description: true, unit: true, unitPrice: true },
    take: 80,
    orderBy: { createdAt: 'desc' },
  });

  const system = `Eres un revisor experto de cotizaciones de construcción en Guatemala.
Analizás una cotización y señalás cosas que conviene REVISAR antes de aprobar (no bloqueás nada).
Buscá criterio, no reglas obvias: precios muy altos o muy bajos vs. renglones parecidos o el
historial, un solo renglón que se lleva una parte desproporcionada del total, mano de obra que
parece baja o alta para el tipo de obra, o un markup que parece bajo para el tiempo y el riesgo.
Devolvé SOLO JSON con esta forma:
{"flags":[{"priority":"alta"|"media"|"baja","title":string,"reason":string,"section":"materiales"|"mano_obra"|"otros"|"consolidacion"|"markup","itemRef":string|null}]}
Máximo 8 avisos, los más relevantes. Si todo se ve razonable, devolvé {"flags":[]}.`;

  const user = `Cotización (totales calculados):
${JSON.stringify(calc)}
Markup actual: ${quote.markupPct}% | Tiempo estimado de obra: ${quote.estimatedDays ?? 'no definido'} días

Renglones:
${JSON.stringify(
    items.map((i) => ({
      tipo: i.kind,
      descripcion: i.description,
      unidad: i.unit,
      cantidad: i.quantity,
      precioUnitario: i.unitPrice,
      monto: i.amount,
      estimado: i.isEstimated,
    })),
  )}

Historial de precios de la empresa (referencia):
${history.length ? JSON.stringify(history.map((h) => ({ d: h.description, u: h.unit, p: h.unitPrice }))) : '(sin historial)'}

Devolvé los avisos en JSON.`;

  const r = await askClaudeJSON<{ flags: Array<Omit<ReviewFlag, 'id' | 'source'>> }>({
    system,
    user,
    maxTokens: 3000,
  });

  const arr = Array.isArray(r.flags) ? r.flags : [];
  return arr.slice(0, 8).map((f, idx) => ({
    id: `claude-${idx}`,
    priority: (['alta', 'media', 'baja'].includes(f.priority) ? f.priority : 'media') as ReviewFlag['priority'],
    title: String(f.title || 'Revisar'),
    reason: String(f.reason || ''),
    section: String(f.section || 'consolidacion'),
    itemRef: f.itemRef ? String(f.itemRef) : null,
    source: 'claude',
  }));
}
