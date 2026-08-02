import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { NoticeAttachment } from '@woeschplan/shared';

const UPLOAD_ROOT = process.env.NOTICE_UPLOAD_DIR ?? path.join(process.cwd(), 'uploads', 'notices');
const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

export function noticeAttachmentPublicUrl(buildingId: string, storedName: string): string {
  return `/uploads/notices/${buildingId}/${storedName}`;
}

export async function saveNoticeAttachmentFile(params: {
  buildingId: string;
  file: File;
}): Promise<NoticeAttachment> {
  const { buildingId, file } = params;

  if (file.size > MAX_BYTES) throw new Error('FILE_TOO_LARGE');

  const mimeType = file.type || 'application/octet-stream';
  if (!ALLOWED_MIME_TYPES.has(mimeType)) throw new Error('UNSUPPORTED_FILE_TYPE');

  const id = randomUUID();
  const storedName = `${id}-${sanitizeFilename(file.name || 'attachment')}`;
  const dir = path.join(UPLOAD_ROOT, buildingId);
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, storedName), buffer);

  return {
    id,
    kind: 'file',
    name: file.name || storedName,
    url: noticeAttachmentPublicUrl(buildingId, storedName),
    mimeType,
  };
}

export function resolveNoticeAttachmentPath(buildingId: string, storedName: string): string {
  const safeName = path.basename(storedName);
  const resolved = path.join(UPLOAD_ROOT, buildingId, safeName);
  if (!resolved.startsWith(path.join(UPLOAD_ROOT, buildingId))) {
    throw new Error('INVALID_PATH');
  }
  return resolved;
}
