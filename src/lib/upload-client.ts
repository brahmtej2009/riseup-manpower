/**
 * Sends a file to /api/admin/upload from the browser.
 *
 * Used by every upload control in the panel, for two reasons:
 *
 *   1. Photos straight off a phone are often 5 to 15 MB and far larger than
 *      the website will ever show. They are scaled down here first, so the
 *      upload is quick on a slow connection and the server has little to do.
 *      The server still checks and re-encodes whatever arrives.
 *   2. A request that never answers used to leave the spinner turning for
 *      ever. After a time limit it is given up with a clear message instead.
 */

const TIMEOUT_MS = 120_000;

/** Types that are safe to redraw on a canvas without losing anything. */
const SHRINKABLE = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function shrink(file: File, maxSize: number): Promise<File> {
  if (!SHRINKABLE.has(file.type) || file.size < 1_000_000) return file;
  if (typeof createImageBitmap !== 'function') return file;

  try {
    // Room for the server's own resize and crop, never more than it keeps.
    const limit = Math.min(3000, Math.max(2000, Math.round(maxSize * 1.5)));
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, limit / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 4_000_000) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    // PNG keeps its transparency (logos); everything else becomes JPEG.
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, '') + (type === 'image/png' ? '.png' : '.jpg');
    return new File([blob], name, { type });
  } catch {
    // Anything the browser cannot decode goes up as it is; the server decides.
    return file;
  }
}

/**
 * Posts the form, shrinking its `file` first when it is a large photo.
 * Resolves to an ordinary Response, so callers read it as before.
 */
export async function postUpload(fd: FormData): Promise<Response> {
  const file = fd.get('file');
  if (file instanceof File && fd.get('kind') !== 'document') {
    fd.set('file', await shrink(file, Number(fd.get('maxSize')) || 1800));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd, signal: controller.signal });
    // A 413 comes from a web server in front of the site (nginx allows only
    // 1 MB unless told otherwise), as an HTML page rather than our JSON.
    if (res.status === 413) {
      return new Response(
        JSON.stringify({
          error:
            'The web server in front of the site refused a file this size. ' +
            'Raise client_max_body_size in nginx (see the README), or try a smaller picture.',
        }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return res;
  } catch (err) {
    const timedOut = (err as Error).name === 'AbortError';
    return new Response(
      JSON.stringify({
        error: timedOut
          ? 'The upload took too long and was stopped. Try a smaller picture or a better connection.'
          : 'The upload failed. Check your connection and try again.',
      }),
      { status: timedOut ? 408 : 503, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    clearTimeout(timer);
  }
}
