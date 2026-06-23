// Datos de ejemplo opcionales. Ejecutar: npm run db:seed
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.quote.count();
  if (existing > 0) {
    console.log('Ya hay cotizaciones; no se crean datos de ejemplo.');
    return;
  }

  const q = await prisma.quote.create({
    data: {
      number: 'COT-2026-0001',
      jobName: 'Remodelación de cocina',
      client: 'Familia López',
      companyName: 'Constructora Demo',
      markupPct: 30,
      items: {
        create: [
          { kind: 'material', description: 'Cemento UGC 4000 PSI', itemType: 'Cemento', unit: 'saco', quantity: 20, unitPrice: 85, position: 0 },
          { kind: 'material', description: 'Block 0.15x0.20x0.40', itemType: 'Block', unit: 'unidad', quantity: 300, unitPrice: 6.5, position: 1 },
          { kind: 'material', description: 'Arena de río', itemType: 'Agregado', unit: 'm3', quantity: 5, unitPrice: 180, position: 2 },
          { kind: 'labor', description: 'Albañilería (mano de obra)', quantity: 1, unitPrice: 4500, position: 0 },
          { kind: 'labor', description: 'Ayudante', quantity: 1, unitPrice: 2200, position: 1 },
          { kind: 'other', description: 'Transporte de materiales', amount: 800, position: 0 },
        ],
      },
    },
  });

  await prisma.historyEntry.create({
    data: {
      quoteId: q.id,
      userName: 'Sistema',
      userRole: 'general',
      section: 'general',
      action: 'crear',
      detail: 'Cotización de ejemplo creada por el seed.',
    },
  });

  console.log('Datos de ejemplo creados:', q.number);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
