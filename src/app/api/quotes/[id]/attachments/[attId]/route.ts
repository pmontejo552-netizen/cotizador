import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, ok, requireUser, forbidden } from '@/lib/api';
import { canUploadAttachment } from '@/lib/permissions';
import { logHistory } from '@/lib/history';
import { readFile, deleteFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// GET /api/quotes/:id/attachments/:attId -> descarga / vista previa (autenticado).
export async function GET(
  req: Request,
  { params }: { params: { id: string; attId: string } },
) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const att = await prisma.attachment.findUnique({ where: { id: params.attId } });
  if (!att || att.quoteId !== params.id) return bad('Adjunto no encontrado.', 404);

  try {
    const buf = readFile(att.filename);
    const url = new URL(req.url);
    const download = url.searchParams.get('download') === '1';
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': att.mimeType,
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(
          att.originalName,
        )}"`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    return bad('El archivo no está disponible en el almacenamiento.', 404);
  }
}

// DELETE /api/quotes/:id/attachments/:attId -> roles con permiso de subir.
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; attId: string } },
) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!canUploadAttachment(user.role)) return forbidden('Tu rol no puede borrar adjuntos.');

  const att = await prisma.attachment.findUnique({ where: { id: params.attId } });
  if (!att || att.quoteId !== params.id) return bad('Adjunto no encontrado.', 404);

  deleteFile(att.filename);
  await prisma.attachment.delete({ where: { id: params.attId } });

  await logHistory({
    quoteId: params.id,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    section: 'general',
    action: 'borrar',
    detail: `Borró adjunto "${att.originalName}".`,
  });
  return ok({ deleted: true });
}
