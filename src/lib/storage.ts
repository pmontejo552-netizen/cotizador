import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Carpeta de almacenamiento de archivos (Excel y adjuntos).
// En Render/Railway, apuntar UPLOAD_DIR a un disco persistente (ej. /data/uploads).
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');

export function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export const MAX_FILE_BYTES = 12 * 1024 * 1024; // 12 MB

export const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
];

export const ALLOWED_EXCEL_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/octet-stream', // algunos navegadores
];

export async function saveBuffer(buf: Buffer, originalName: string): Promise<string> {
  ensureUploadDir();
  const ext = path.extname(originalName).slice(0, 10);
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buf);
  return filename;
}

export function readFile(filename: string): Buffer {
  const safe = path.basename(filename); // evita path traversal
  return fs.readFileSync(path.join(UPLOAD_DIR, safe));
}

export function deleteFile(filename: string) {
  const safe = path.basename(filename);
  const p = path.join(UPLOAD_DIR, safe);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
