import { prisma } from '@/lib/db';
import { bad, ok, actorFrom } from '@/lib/api';
import { logHistory } from '@/lib/history';
import { readFile, deleteFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// GET /api/quotes/:id/attachments/:attId -> descarga / vista previa
export async function GET(
  req: Request,
  { params }: { params: { id: string; attId: string } },
) {
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

// DELETE /api/quotes/:id/attachments/:attId
export async function DELETE(
  req: Request,
  { params }: { params: { id: string; attId: string } },
) {
  const actor = actorFrom({}, req.headers);
  const att = await prisma.attachment.findUnique({ where: { id: params.attId } });
  if (!att || att.quoteId !== params.id) return bad('Adjunto no encontrado.', 404);

  deleteFile(att.filename);
  await prisma.attachment.delete({ where: { id: params.attId } });

  await logHistory({
    quoteId: params.id,
    userName: actor.name,
    userRole: actor.role,
    section: 'general',
    action: 'borrar',
    detail: `Borró adjunto "${att.originalName}".`,
  });
  return ok({ deleted: true });
}
