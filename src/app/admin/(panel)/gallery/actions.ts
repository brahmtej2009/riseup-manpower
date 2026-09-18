'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { guard, audit, formStr, formInt, formBool, type ActionResult } from '@/lib/admin-actions';
import { deleteMedia } from '@/lib/uploads';

function refresh() {
  revalidatePath('/admin/gallery');
  revalidatePath('/admin/themes');
  revalidatePath('/');
}

/**
 * Only a path produced by our own upload endpoint is ever stored, so a posted
 * form cannot point the gallery at somebody else's server.
 */
function cleanPath(value: string): string {
  return /^\/uploads\/[A-Za-z0-9._-]+$/.test(value) ? value : '';
}

/** Adds one or more photographs. The picker posts a JSON array of paths. */
export async function addGalleryPhotos(formData: FormData): Promise<ActionResult> {
  const g = await guard('gallery.edit');
  if (!g.ok) return g;

  let paths: string[] = [];
  try {
    const parsed = JSON.parse(formStr(formData, 'paths', 8000) || '[]');
    if (Array.isArray(parsed)) paths = parsed.map(String).map(cleanPath).filter(Boolean);
  } catch {
    paths = [];
  }

  if (paths.length === 0) {
    return { ok: false, error: 'Choose at least one photograph to add.' };
  }

  const existing = new Set(
    db.all<{ path: string }>('SELECT path FROM gallery_photos').map((r) => r.path)
  );
  const fresh = paths.filter((p) => !existing.has(p)).slice(0, 40);

  if (fresh.length === 0) {
    return { ok: false, error: 'Those photographs are already in the gallery.' };
  }

  let order = (db.scalar<number>('SELECT COALESCE(MAX(sort_order), 0) AS n FROM gallery_photos') ?? 0);

  db.tx(() => {
    for (const path of fresh) {
      order += 1;
      db.run('INSERT INTO gallery_photos (path, sort_order) VALUES (?, ?)', [path, order]);
    }
  });

  await audit(g.user, 'gallery.add', 'gallery', 'batch', `${fresh.length} photograph(s)`);
  refresh();

  return {
    ok: true,
    message:
      fresh.length === 1
        ? 'The photograph has been added to the gallery.'
        : `${fresh.length} photographs have been added to the gallery.`,
  };
}

/** Saves the title and caption on one photograph. */
export async function saveGalleryPhoto(formData: FormData): Promise<ActionResult> {
  const g = await guard('gallery.edit');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const row = db.get<{ id: number }>('SELECT id FROM gallery_photos WHERE id = ?', [id]);
  if (!row) return { ok: false, error: 'That photograph is no longer in the gallery.' };

  db.run(
    `UPDATE gallery_photos
        SET title = ?, caption = ?, is_visible = ?, updated_at = datetime('now')
      WHERE id = ?`,
    [
      formStr(formData, 'title', 140),
      formStr(formData, 'caption', 400),
      formBool(formData, 'is_visible') ? 1 : 0,
      id,
    ]
  );

  await audit(g.user, 'gallery.update', 'gallery', id);
  refresh();
  return { ok: true, message: 'Saved.' };
}

export async function toggleGalleryPhoto(formData: FormData): Promise<ActionResult> {
  const g = await guard('gallery.edit');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const row = db.get<{ is_visible: number }>(
    'SELECT is_visible FROM gallery_photos WHERE id = ?',
    [id]
  );
  if (!row) return { ok: false, error: 'That photograph is no longer in the gallery.' };

  db.run("UPDATE gallery_photos SET is_visible = ?, updated_at = datetime('now') WHERE id = ?", [
    row.is_visible ? 0 : 1,
    id,
  ]);

  refresh();
  return {
    ok: true,
    message: row.is_visible ? 'Hidden from the website.' : 'Now shown on the website.',
  };
}

export async function moveGalleryPhoto(formData: FormData): Promise<ActionResult> {
  const g = await guard('gallery.edit');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const up = formStr(formData, 'direction', 4) === 'up';

  const all = db.all<{ id: number }>('SELECT id FROM gallery_photos ORDER BY sort_order, id');
  const index = all.findIndex((r) => r.id === id);
  if (index === -1) return { ok: false, error: 'That photograph is no longer in the gallery.' };

  const swapWith = up ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= all.length) {
    return { ok: true, message: 'Already at the end of the list.' };
  }

  const reordered = [...all];
  [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];

  db.tx(() => {
    reordered.forEach((r, i) => {
      db.run('UPDATE gallery_photos SET sort_order = ? WHERE id = ?', [i + 1, r.id]);
    });
  });

  refresh();
  return { ok: true, message: 'Order updated.' };
}

/**
 * Removes a photograph from the gallery. The file itself is only deleted when
 * the box is ticked, because the same image may be in use elsewhere on the
 * site - a team photograph, or inside a post.
 */
export async function deleteGalleryPhoto(formData: FormData): Promise<ActionResult> {
  const g = await guard('gallery.delete');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const row = db.get<{ path: string; title: string }>(
    'SELECT path, title FROM gallery_photos WHERE id = ?',
    [id]
  );
  if (!row) return { ok: false, error: 'That photograph has already been removed.' };

  db.run('DELETE FROM gallery_photos WHERE id = ?', [id]);

  let fileRemoved = false;
  if (formBool(formData, 'delete_file')) {
    const media = db.get<{ id: number }>('SELECT id FROM media WHERE path = ?', [row.path]);
    if (media) fileRemoved = await deleteMedia(media.id);
  }

  await audit(g.user, 'gallery.delete', 'gallery', id, fileRemoved ? 'file deleted too' : '');
  refresh();

  return {
    ok: true,
    message: fileRemoved
      ? 'Removed from the gallery, and the file has been deleted.'
      : 'Removed from the gallery. The file is still in the media library.',
  };
}

/**
 * The confirmation dialog posts a plain form, which cannot show a returned
 * result, so this wrapper simply performs the removal.
 */
export async function removeGalleryPhoto(formData: FormData): Promise<void> {
  await deleteGalleryPhoto(formData);
}
