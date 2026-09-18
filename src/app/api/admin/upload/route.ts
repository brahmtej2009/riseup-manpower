import { NextRequest, NextResponse } from 'next/server';
import { apiUser, writeAudit } from '@/lib/auth';
import { storeImage, storeDocument } from '@/lib/uploads';

/**
 * Upload endpoint used by the rich text editor, the media library and the
 * logo/photo pickers.
 *
 * Requires the media.upload permission - an upload is a write, and the file
 * is served publicly afterwards.
 */
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = await apiUser('media.upload');
  if (!user) {
    return NextResponse.json(
      { error: 'You do not have permission to upload files.' },
      { status: 403 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'The upload could not be read.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No file was received.' }, { status: 400 });
  }

  const folder = String(form.get('folder') ?? 'general').replace(/[^a-z0-9-]/gi, '').slice(0, 30);
  const square = form.get('square') === '1';
  const maxSize = Math.min(Math.max(Number(form.get('maxSize')) || 1800, 120), 3000);
  const kind = String(form.get('kind') ?? 'image');

  try {
    const stored =
      kind === 'document'
        ? await storeDocument(file, user.id, folder || 'documents')
        : await storeImage(file, user.id, {
            folder: folder || 'general',
            square,
            maxSize,
            alt: String(form.get('alt') ?? '').slice(0, 200),
          });

    await writeAudit(
      user.id,
      user.full_name || user.username,
      'media.upload',
      'media',
      String(stored.id),
      `${stored.filename} (${Math.round(stored.size / 1024)} KB)`
    );

    return NextResponse.json({
      ok: true,
      id: stored.id,
      url: stored.path,
      width: stored.width,
      height: stored.height,
      size: stored.size,
      name: file.name,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 });
  }
}
