import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ok, bad, requireUser, forbidden } from '@/lib/api';
import { canUploadAttachment } from '@/lib/permissions';
import { logHistory } from '@/lib/history';
import { saveBuffer, MAX_FILE_BYTES, ALLOWED_ATTACHMENT_TYPES } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// GET /api/quotes/:id/attachments (cualquier usuario autenticado)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const list = await prisma.attachment.findMany({
    where: { quoteId: params.id },
    orderBy: { createdAt: 'desc' },
  });
  return ok(list);
}

// POST /api/quotes/:id/attachments  (multipart/form-data: file)
// Solo roles con permiso pueden subir. Valida tipo y tamaño; sanea el nombre.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!canUploadAttachment(user.role)) {
    return forbidden('Tu rol no puede subir archivos.');
  }

  const form = await req.formData();
  const file = form.get('file');

  if (!(file instanceof File)) return bad('No se recibió ningún archivo.');
  if (file.size > MAX_FILE_BYTES) return bad('El archivo supera el límite de 12 MB.');
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    return bad('Tipo no permitido. Solo PDF e imágenes (PNG, JPG, WEBP, GIF).');
  }

  const q = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!q) return bad('Cotización no encontrada.', 404);

  const buf = Buffer.from(await file.arrayBuffer());
  const filename = await saveBuffer(buf, file.name); // saveBuffer sanea el nombre

  const att = await prisma.attachment.create({
    data: {
      quoteId: params.id,
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      uploadedBy: `${user.name} (${user.role})`,
    },
  });

  await logHistory({
    quoteId: params.id,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    section: 'general',
    action: 'crear',
    detail: `Subió adjunto "${file.name}".`,
  });

  return ok(att, { status: 201 });
}
