// Prueba unitaria mínima del motor de cálculo. Ejecutar: npm run test:calc
import { computeQuote, marginToMarkup, markupToMargin, round2 } from './calc';

let pass = 0;
let fail = 0;
function assert(name: string, got: number, want: number, tol = 0.01) {
  if (Math.abs(got - want) <= tol) {
    pass++;
  } else {
    fail++;
    console.error(`✗ ${name}: esperado ${want}, obtuve ${got}`);
  }
}

// Caso base: 2 materiales, 1 mano de obra, 1 otro.
// materiales: 10*5=50 + 4*25=100 => 150
// desperdicio 5% => 7.5 ; materialesTotal => 157.5
// mano de obra: 3*100=300
// otros: 200
// sumaCostos = 157.5 + 300 + 200 = 657.5
// imprevistos 5% => 32.875 -> 32.88 ; costoBase => 690.38
// markup 30% => 207.11 ; precioSinIva => 897.49
// margen = 207.11/897.49 => 23.08%
// iva 12% => 107.70 ; precioFinal => 1005.19
const r = computeQuote({
  items: [
    { kind: 'material', quantity: 10, unitPrice: 5, amount: null },
    { kind: 'material', quantity: 4, unitPrice: 25, amount: null },
    { kind: 'labor', quantity: 3, unitPrice: 100, amount: null },
    { kind: 'other', quantity: 0, unitPrice: 0, amount: 200 },
  ],
  wastePct: 5,
  contingencyPct: 5,
  markupPct: 30,
  ivaPct: 12,
});

assert('subtotalMateriales', r.subtotalMateriales, 150);
assert('desperdicio', r.desperdicio, 7.5);
assert('materialesTotal', r.materialesTotal, 157.5);
assert('subtotalManoObra', r.subtotalManoObra, 300);
assert('subtotalOtros', r.subtotalOtros, 200);
assert('sumaCostos', r.sumaCostos, 657.5);
assert('imprevistos', r.imprevistos, 32.88);
assert('costoBase', r.costoBase, 690.38);
assert('ganancia', r.ganancia, 207.11);
assert('precioSinIva', r.precioSinIva, 897.49);
assert('margenPct', r.margenPct, 23.08);
assert('iva', r.iva, 107.7);
assert('precioFinal', r.precioFinal, 1005.19);

// markup <-> margen son consistentes
assert('markupToMargin(30)', markupToMargin(30), 23.08);
assert('marginToMarkup(23.08)', round2(marginToMarkup(23.08)), 30, 0.05);
// margen objetivo 25% => markup 33.33%
assert('marginToMarkup(25)', marginToMarkup(25), 33.33);

console.log(`\nResultado: ${pass} pasaron, ${fail} fallaron`);
if (fail > 0) process.exit(1);
