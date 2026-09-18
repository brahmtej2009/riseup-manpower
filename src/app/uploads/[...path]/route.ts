import { NextRequest } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { UPLOAD_DIR } from '@/lib/db';

/**
 * Serves uploaded files from data/uploads.
 *
 * They are deliberately kept outside /public so that an update (which
 * replaces the code directory) can never delete them, and so that every
 * request passes through this check rather than being served blindly.
 */

const MIME: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain; charset=utf-8',
  '.rtf': 'application/rtf',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const name = (segments ?? []).join('/');

  // Path traversal guard: the resolved file must sit directly inside the
  // uploads folder, and the name must not contain separators at all.
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\') || name.startsWith('.')) {
    return new Response('Not found', { status: 404 });
  }

  const file = path.resolve(UPLOAD_DIR, name);
  if (!file.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
    return new Response('Not found', { status: 404 });
  }

  let stat;
  try {
    stat = await fs.stat(file);
    if (!stat.isFile()) throw new Error('not a file');
  } catch {
    return new Response('Not found', { status: 404 });
  }

  const ext = path.extname(name).toLowerCase();
  const type = MIME[ext];
  if (!type) return new Response('Not found', { status: 404 });

  // Uploaded files never change - their names are random and unique - so they
  // can be cached hard.
  const etag = `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  if (req.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  const headers = new Headers({
    'Content-Type': type,
    'Content-Length': String(stat.size),
    'Cache-Control': 'public, max-age=31536000, immutable',
    ETag: etag,
    // Even though only known types are served, tell the browser not to guess,
    // and never to run anything from this path as a document.
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  });

  if (ext === '.pdf' || ext === '.doc' || ext === '.docx' || ext === '.rtf') {
    headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(name)}"`);
  }

  const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new Response(stream, { headers });
}
