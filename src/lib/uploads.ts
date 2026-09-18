import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { db, UPLOAD_DIR } from './db';

/**
 * File uploads.
 *
 * Images are re-encoded through sharp rather than stored as received. That
 * does two useful things at once: it strips anything hidden in the original
 * file (a script in EXIF, a polyglot GIF/JS), and it keeps the site fast by
 * resizing and converting to WebP.
 */

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // 12 MB
export const MAX_DOC_BYTES = 8 * 1024 * 1024; // 8 MB

const IMAGE_TYPES = new Set([
  'image/jpeg','image/png','image/webp','image/gif','image/avif','image/svg+xml','image/heic','image/heif',
]);

const DOC_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/rtf',
  'text/plain',
]);

export type UploadKind = 'image' | 'document';

export interface StoredFile {
  id: number;
  path: string; // public URL, e.g. /uploads/abc.webp
  filename: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
}

export interface ImageOptions {
  /** Longest edge in pixels. */
  maxSize?: number;
  /** Crop to a centred square - used for logos and team photographs. */
  square?: boolean;
  folder?: string;
  alt?: string;
}

function randomName(ext: string): string {
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${ym}-${crypto.randomBytes(8).toString('hex')}${ext}`;
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

/** True if the bytes really are the image type they claim to be. */
function looksLikeImage(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  const hex = buf.subarray(0, 12).toString('hex').toLowerCase();
  const ascii = buf.subarray(0, 512).toString('latin1');
  return (
    hex.startsWith('ffd8ff') || // jpeg
    hex.startsWith('89504e47') || // png
    hex.startsWith('47494638') || // gif
    (hex.startsWith('52494646') && ascii.includes('WEBP')) || // webp
    ascii.includes('ftypavif') ||
    ascii.includes('ftypheic') ||
    ascii.includes('ftypmif1') ||
    /^\s*(<\?xml|<svg)/i.test(ascii) // svg
  );
}

/**
 * Stores an uploaded image. Returns the media row.
 * Throws an Error with a message suitable for showing to the user.
 */
export async function storeImage(
  file: File,
  userId: number | null,
  opts: ImageOptions = {}
): Promise<StoredFile> {
  const { maxSize = 1800, square = false, folder = 'general', alt = '' } = opts;

  if (!file || file.size === 0) throw new Error('No file was received.');
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`That image is ${(file.size / 1048576).toFixed(1)} MB. The limit is 12 MB.`);
  }
  if (file.type && !IMAGE_TYPES.has(file.type)) {
    throw new Error('That file type is not supported. Use JPG, PNG, WebP or GIF.');
  }

  const input = Buffer.from(await file.arrayBuffer());
  if (!looksLikeImage(input)) {
    throw new Error('That file does not appear to be an image.');
  }

  await ensureDir();

  let output: Buffer;
  let width: number | undefined;
  let height: number | undefined;
  let filename: string;
  let mime: string;

  const isSvg = /^\s*(<\?xml|<svg)/i.test(input.subarray(0, 512).toString('latin1'));

  if (isSvg) {
    // SVG is markup, and markup can carry scripts. Rasterise it instead of
    // trusting it - the result is a plain bitmap with nothing executable.
    const img = sharp(input, { density: 200 });
    const pipeline = square
      ? img.resize(Math.min(maxSize, 1024), Math.min(maxSize, 1024), { fit: 'cover', position: 'centre' })
      : img.resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true });
    output = await pipeline.webp({ quality: 90 }).toBuffer();
    const meta = await sharp(output).metadata();
    width = meta.width;
    height = meta.height;
    filename = randomName('.webp');
    mime = 'image/webp';
  } else {
    const img = sharp(input, { animated: true, failOn: 'error' });
    const meta = await img.metadata();
    const animated = (meta.pages ?? 1) > 1;

    const pipeline = square
      ? sharp(input, { animated })
          .rotate()
          .resize(maxSize, maxSize, { fit: 'cover', position: 'attention' })
      : sharp(input, { animated })
          .rotate()
          .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true });

    output = await pipeline.webp({ quality: 82, effort: 4 }).toBuffer();

    // Very occasionally WebP is larger than a well-compressed original.
    if (output.length > input.length && !square && (meta.width ?? 0) <= maxSize) {
      output = input;
      // The extension comes from what sharp itself decoded the bytes as,
      // never from the visitor-supplied file name - the same reasoning as
      // the document upload below: the name on the file is not evidence of
      // what is actually inside it.
      const byFormat: Record<string, string> = {
        jpeg: '.jpg', png: '.png', gif: '.gif', webp: '.webp', avif: '.avif', heif: '.heic',
      };
      const detectedExt = byFormat[meta.format ?? ''] ?? '.jpg';
      filename = randomName(detectedExt);
      mime = `image/${meta.format === 'jpeg' ? 'jpeg' : meta.format ?? 'jpeg'}`;
      width = meta.width;
      height = meta.height;
    } else {
      const outMeta = await sharp(output).metadata();
      width = outMeta.width;
      height = outMeta.height;
      filename = randomName('.webp');
      mime = 'image/webp';
    }
  }

  await fs.writeFile(path.join(UPLOAD_DIR, filename), output);

  const publicPath = `/uploads/${filename}`;
  const info = db.run(
    `INSERT INTO media (filename, original_name, path, mime, size, width, height, alt, folder, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [filename, file.name.slice(0, 200), publicPath, mime, output.length, width ?? null, height ?? null, alt, folder, userId]
  );

  return { id: info.lastInsertRowid, path: publicPath, filename, mime, size: output.length, width, height };
}

/** Stores a resume or similar document, unmodified but type-checked. */
/**
 * Byte patterns that mean a document carries something that runs, rather
 * than something that is only read: JavaScript or an automatic action
 * embedded in a PDF, or a macro project embedded in a Word file. None of
 * these belong in a resume, and none of them can be inspected safely just by
 * opening the file - they run the moment a reader that honours them does.
 * The check is a plain substring search over the raw bytes, deliberately
 * broad, because a resume upload has no legitimate reason to ever contain
 * any of them.
 */
function looksExecutable(input: Buffer, isPdf: boolean, isZipDocx: boolean, isDoc: boolean): string | null {
  if (isPdf) {
    const text = input.toString('latin1');
    // A name object followed by one of these keywords is how a PDF wires up
    // a script or an action that fires on open, on a field change, and so on.
    if (/\/(JavaScript|JS)\b/.test(text)) return 'It contains an embedded script.';
    if (/\/(OpenAction|AA|Launch|SubmitForm|ImportData)\b/.test(text)) {
      return 'It contains an embedded action that runs automatically.';
    }
    return null;
  }

  if (isZipDocx) {
    // A .docx is a zip archive. A genuine one never contains a macro
    // project - that only exists in a macro-enabled .docm/.dotm, which a
    // resume has no reason to be. The zip's own directory stores entry names
    // as plain ASCII text, so a substring search finds it without needing a
    // full zip parse.
    if (input.includes('vbaProject.bin')) return 'It contains an embedded macro.';
    return null;
  }

  if (isDoc) {
    // The legacy binary format stores a macro project as an OLE stream
    // named exactly this. A plain .doc resume never has one.
    if (input.includes(Buffer.from('_VBA_PROJECT', 'latin1'))) {
      return 'It contains an embedded macro.';
    }
    return null;
  }

  return null;
}

export async function storeDocument(
  file: File,
  userId: number | null,
  folder = 'resumes'
): Promise<StoredFile> {
  if (!file || file.size === 0) throw new Error('No file was received.');
  if (file.size > MAX_DOC_BYTES) {
    throw new Error(`That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is 8 MB.`);
  }
  if (file.type && !DOC_TYPES.has(file.type)) {
    throw new Error('Please upload the resume as a PDF or Word document.');
  }

  const input = Buffer.from(await file.arrayBuffer());
  const head = input.subarray(0, 8).toString('latin1');
  const isPdf = head.startsWith('%PDF');
  const isZipDocx = input[0] === 0x50 && input[1] === 0x4b; // .docx is a zip
  const isDoc = head.startsWith('\xD0\xCF\x11\xE0'); // legacy .doc
  const isText = !isPdf && !isZipDocx && !isDoc &&
    /^[\x09\x0A\x0D\x20-\x7E\s]*$/.test(input.subarray(0, 256).toString('latin1'));

  if (!isPdf && !isZipDocx && !isDoc && !isText) {
    throw new Error('That file does not appear to be a PDF or Word document.');
  }

  const executable = looksExecutable(input, isPdf, isZipDocx, isDoc);
  if (executable) {
    throw new Error(
      `That file cannot be accepted. ${executable} Please upload a plain document with no ` +
        'macros or embedded scripts.'
    );
  }

  await ensureDir();
  // The extension is decided by what the bytes actually are, never by the
  // name the visitor gave the file. A resume named "resume.svg" or
  // "resume.html" containing ordinary short text would otherwise pass the
  // plain-text check above and be written out under that extension - and
  // the serving route maps .svg to image/svg+xml, which a browser will
  // render and run scripts from. Only these four extensions are ever
  // possible here, so nothing this function stores can ever be served as
  // anything other than a plain document.
  const ext = isPdf ? '.pdf' : isZipDocx ? '.docx' : isDoc ? '.doc' : '.txt';
  const filename = randomName(ext);
  await fs.writeFile(path.join(UPLOAD_DIR, filename), input);

  // Recorded from the sniffed type, not the browser-supplied one, so the
  // media library always describes what a file actually is.
  const mime = isPdf
    ? 'application/pdf'
    : isZipDocx
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : isDoc
        ? 'application/msword'
        : 'text/plain';

  const publicPath = `/uploads/${filename}`;
  const info = db.run(
    `INSERT INTO media (filename, original_name, path, mime, size, folder, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [filename, file.name.slice(0, 200), publicPath, mime, input.length, folder, userId]
  );

  return {
    id: info.lastInsertRowid,
    path: publicPath,
    filename,
    mime,
    size: input.length,
  };
}

/** Removes a media row and its file from disk. */
export async function deleteMedia(id: number): Promise<boolean> {
  const row = db.get<{ filename: string }>('SELECT filename FROM media WHERE id = ?', [id]);
  if (!row) return false;
  db.run('DELETE FROM media WHERE id = ?', [id]);
  try {
    // Guard against a crafted filename escaping the uploads folder.
    const target = path.resolve(UPLOAD_DIR, row.filename);
    if (target.startsWith(path.resolve(UPLOAD_DIR))) await fs.unlink(target);
  } catch {
    /* file already gone */
  }
  return true;
}

/** Resolves a public /uploads path to a file on disk, or null if invalid. */
export function resolveUpload(publicPath: string): string | null {
  const name = publicPath.replace(/^\/uploads\//, '');
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) return null;
  const full = path.resolve(UPLOAD_DIR, name);
  if (!full.startsWith(path.resolve(UPLOAD_DIR))) return null;
  return full;
}
