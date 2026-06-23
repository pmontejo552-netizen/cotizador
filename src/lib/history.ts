import { prisma } from './db';

interface LogArgs {
  quoteId: string;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  section: string;
  action: string;
  detail: string;
}

// Registra una entrada en el historial, atada al usuario AUTENTICADO (id real).
export async function logHistory(a: LogArgs) {
  try {
    await prisma.historyEntry.create({
      data: {
        quoteId: a.quoteId,
        userId: a.userId ?? null,
        userName: a.userName?.trim() || 'Sistema',
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
