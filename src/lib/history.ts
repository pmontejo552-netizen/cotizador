import { prisma } from './db';

interface LogArgs {
  quoteId: string;
  userName?: string | null;
  userRole?: string | null;
  section: string;
  action: string;
  detail: string;
}

// Registra una entrada en el historial. Tolera actor faltante.
export async function logHistory(a: LogArgs) {
  try {
    await prisma.historyEntry.create({
      data: {
        quoteId: a.quoteId,
        userName: a.userName?.trim() || 'Desconocido',
        userRole: a.userRole?.trim() || 'general',
        section: a.section,
        action: a.action,
        detail: a.detail.slice(0, 500),
      },
    });
  } catch (e) {
    console.error('No se pudo registrar historial:', e);
  }
}
