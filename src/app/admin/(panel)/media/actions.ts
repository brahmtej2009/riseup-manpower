'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { guard, audit, formInt, type ActionResult } from '@/lib/admin-actions';
import { deleteMedia } from '@/lib/uploads';

export async function deleteMediaItem(formData: FormData): Promise<ActionResult> {
  const g = await guard('media.delete');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const row = db.get<{ path: string; original_name: string }>(
    'SELECT path, original_name FROM media WHERE id = ?',
    [id]
  );
  if (!row) return { ok: false, error: 'That file has already been removed.' };

  // Warn rather than silently break a page that still points at the file.
  // hero_gallery is stored as a JSON array inside one settings row, so an
  // exact match on `value` would never find a file used there - LIKE is
  // needed for that one the same way it already is for the post body.
  const usedByPost = db.scalar<number>(
    'SELECT COUNT(*) AS n FROM posts WHERE cover_path = ? OR body_html LIKE ?',
    [row.path, `%${row.path}%`]
  ) ?? 0;
  const usedByTeam = db.scalar<number>(
    'SELECT COUNT(*) AS n FROM team_members WHERE photo_path = ?',
    [row.path]
  ) ?? 0;
  const usedBySettings = db.scalar<number>(
    'SELECT COUNT(*) AS n FROM settings WHERE value = ? OR value LIKE ?',
    [row.path, `%${row.path}%`]
  ) ?? 0;
  const usedByGallery = db.scalar<number>(
    'SELECT COUNT(*) AS n FROM gallery_photos WHERE path = ?',
    [row.path]
  ) ?? 0;
  const usedByLogos = db.scalar<number>(
    'SELECT COUNT(*) AS n FROM client_logos WHERE path = ?',
    [row.path]
  ) ?? 0;

  const inUse = usedByPost + usedByTeam + usedBySettings + usedByGallery + usedByLogos;
  if (inUse > 0 && formData.get('force') !== '1') {
    return {
      ok: false,
      error:
        `This file is still being used in ${inUse} place${inUse === 1 ? '' : 's'} ` +
        `(posts, team photos, the photo gallery, a client logo, or settings such as the ` +
        `hero photos or the logo). Remove it there first, or tick "delete anyway".`,
    };
  }

  await deleteMedia(id);
  await audit(g.user, 'media.delete', 'media', id, row.original_name || row.path);

  revalidatePath('/admin/media');
  return { ok: true, message: 'File deleted.' };
}
