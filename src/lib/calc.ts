// Motor de cálculo. Implementa EXACTAMENTE las fórmulas del documento.
// Todas las funciones son puras para poder probarlas (ver calc.test.ts).

import type { LineItemDTO, QuoteDTO } from './types';

export interface CalcResult {
  subtotalMateriales: number; // suma de renglones de material
  desperdicio: number; // subtotalMateriales * desperdicio%
  materialesTotal: number; // subtotalMateriales + desperdicio
  subtotalManoObra: number; // suma de (cantidad * costo_unitario)
  subtotalOtros: number; // suma de montos
  sumaCostos: number; // materialesTotal + manoObra + otros
  imprevistos: number; // sumaCostos * imprevistos%
  costoBase: number; // sumaCostos + imprevistos
  ganancia: number; // costoBase * markup%
  precioSinIva: number; // costoBase + ganancia
  margenPct: number; // ganancia / precioSinIva * 100
  iva: number; // precioSinIva * iva%
  precioFinal: number; // precioSinIva + iva
}

/** subtotal por renglón de material = cantidad × precio unitario */
export function materialRowSubtotal(it: Pick<LineItemDTO, 'quantity' | 'unitPrice'>): number {
  return round2((it.quantity || 0) * (it.unitPrice || 0));
}

/** subtotal por renglón de mano de obra = cantidad × costo unitario */
export function laborRowSubtotal(it: Pick<LineItemDTO, 'quantity' | 'unitPrice'>): number {
  return round2((it.quantity || 0) * (it.unitPrice || 0));
}

export interface CalcInput {
  items: Array<Pick<LineItemDTO, 'kind' | 'quantity' | 'unitPrice' | 'amount'>>;
  wastePct: number;
  contingencyPct: number;
  markupPct: number;
  ivaPct: number;
}

export function computeQuote(input: CalcInput): CalcResult {
  const materials = input.items.filter((i) => i.kind === 'material');
  const labor = input.items.filter((i) => i.kind === 'labor');
  const others = input.items.filter((i) => i.kind === 'other');

  const subtotalMateriales = round2(
    materials.reduce((s, i) => s + (i.quantity || 0) * (i.unitPrice || 0), 0),
  );
  const desperdicio = round2(subtotalMateriales * (input.wastePct / 100));
  const materialesTotal = round2(subtotalMateriales + desperdicio);

  const subtotalManoObra = round2(
    labor.reduce((s, i) => s + (i.quantity || 0) * (i.unitPrice || 0), 0),
  );

  const subtotalOtros = round2(others.reduce((s, i) => s + (i.amount || 0), 0));

  const sumaCostos = round2(materialesTotal + subtotalManoObra + subtotalOtros);
  const imprevistos = round2(sumaCostos * (input.contingencyPct / 100));
  const costoBase = round2(sumaCostos + imprevistos);

  const ganancia = round2(costoBase * (input.markupPct / 100));
  const precioSinIva = round2(costoBase + ganancia);
  const margenPct = precioSinIva > 0 ? round2((ganancia / precioSinIva) * 100) : 0;

  const iva = round2(precioSinIva * (input.ivaPct / 100));
  const precioFinal = round2(precioSinIva + iva);

  return {
    subtotalMateriales,
    desperdicio,
    materialesTotal,
    subtotalManoObra,
    subtotalOtros,
    sumaCostos,
    imprevistos,
    costoBase,
    ganancia,
    precioSinIva,
    margenPct,
    iva,
    precioFinal,
  };
}

export function computeFromQuote(quote: QuoteDTO): CalcResult {
  return computeQuote({
    items: quote.items,
    wastePct: quote.wastePct,
    contingencyPct: quote.contingencyPct,
    markupPct: quote.markupPct,
    ivaPct: quote.ivaPct,
  });
}

/**
 * Convierte un margen objetivo (%) al markup (%) necesario.
 * precio_sin_iva = costo_base / (1 − margen%/100)  =>  markup = margen / (1 − margen/100)
 */
export function marginToMarkup(marginPct: number): number {
  if (marginPct >= 100) return Infinity;
  return round2((marginPct / (1 - marginPct / 100)) || 0);
}

/** Convierte un markup (%) al margen (%) resultante. margen = markup / (1 + markup/100) */
export function markupToMargin(markupPct: number): number {
  return round2((markupPct / (1 + markupPct / 100)) || 0);
}

/** % de avance de la cotización según secciones cerradas (5 secciones). */
export function progressPct(q: {
  materialsClosed: boolean;
  laborClosed: boolean;
  otherClosed: boolean;
  markupClosed: boolean;
  approved: boolean;
}): number {
  const flags = [q.materialsClosed, q.laborClosed, q.otherClosed, q.markupClosed, q.approved];
  const done = flags.filter(Boolean).length;
  return Math.round((done / flags.length) * 100);
}

export function round2(n: number): number {
  if (!isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Formatea moneda Q o $. */
export function formatMoney(n: number, currency: string): string {
  const symbol = currency === 'USD' ? '$' : 'Q';
  return `${symbol} ${(n || 0).toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
