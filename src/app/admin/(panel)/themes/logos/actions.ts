'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { guard, audit, formStr, formInt, formBool, type ActionResult } from '@/lib/admin-actions';

function refresh() {
  revalidatePath('/admin/themes/logos');
  revalidatePath('/admin/themes');
  revalidatePath('/');
}

/** Only a path from our own upload endpoint is ever stored. */
function cleanPath(value: string): string {
  return /^\/uploads\/[A-Za-z0-9._-]+$/.test(value) ? value : '';
}

/** Rejects anything that is not an ordinary web address. */
function cleanUrl(value: string): string {
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

export async function saveLogo(formData: FormData): Promise<ActionResult> {
  const g = await guard('theme.edit');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const name = formStr(formData, 'name', 120);
  const path = cleanPath(formStr(formData, 'path', 300));
  const rawUrl = formStr(formData, 'url', 300);
  const url = cleanUrl(rawUrl);

  if (name.length < 1) {
    return {
      ok: false,
      error: 'Give the company a name. It is read out by screen readers in place of the logo.',
      fields: { name: 'A name is required' },
    };
  }
  if (!path) {
    return { ok: false, error: 'Upload the logo image first.', fields: { path: 'A logo is required' } };
  }
  if (rawUrl && !url) {
    return {
      ok: false,
      error: 'That website address does not look right. It should start with https://',
      fields: { url: 'Use a full address starting with https://' },
    };
  }

  const visible = formBool(formData, 'is_visible') ? 1 : 0;

  if (id) {
    const existing = db.get<{ id: number }>('SELECT id FROM client_logos WHERE id = ?', [id]);
    if (!existing) return { ok: false, error: 'That logo has already been removed.' };

    db.run(
      `UPDATE client_logos
          SET name = ?, path = ?, url = ?, is_visible = ?, updated_at = datetime('now')
        WHERE id = ?`,
      [name, path, url, visible, id]
    );
    await audit(g.user, 'logo.update', 'client_logo', id, name);
  } else {
    const nextOrder =
      (db.scalar<number>('SELECT COALESCE(MAX(sort_order), 0) AS n FROM client_logos') ?? 0) + 1;
    const info = db.run(
      'INSERT INTO client_logos (name, path, url, is_visible, sort_order) VALUES (?, ?, ?, ?, ?)',
      [name, path, url, visible, nextOrder]
    );
    await audit(g.user, 'logo.create', 'client_logo', info.lastInsertRowid, name);
  }

  refresh();
  return { ok: true, message: id ? 'Logo updated.' : `${name} has been added to the row.` };
}

export async function toggleLogo(formData: FormData): Promise<ActionResult> {
  const g = await guard('theme.edit');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const row = db.get<{ is_visible: number }>('SELECT is_visible FROM client_logos WHERE id = ?', [id]);
  if (!row) return { ok: false, error: 'That logo has already been removed.' };

  db.run("UPDATE client_logos SET is_visible = ?, updated_at = datetime('now') WHERE id = ?", [
    row.is_visible ? 0 : 1,
    id,
  ]);

  refresh();
  return { ok: true, message: row.is_visible ? 'Hidden from the row.' : 'Now shown in the row.' };
}

export async function moveLogo(formData: FormData): Promise<ActionResult> {
  const g = await guard('theme.edit');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const up = formStr(formData, 'direction', 4) === 'up';

  const all = db.all<{ id: number }>('SELECT id FROM client_logos ORDER BY sort_order, id');
  const index = all.findIndex((r) => r.id === id);
  if (index === -1) return { ok: false, error: 'That logo has already been removed.' };

  const swapWith = up ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= all.length) {
    return { ok: true, message: 'Already at the end of the row.' };
  }

  const reordered = [...all];
  [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];

  db.tx(() => {
    reordered.forEach((r, i) => {
      db.run('UPDATE client_logos SET sort_order = ? WHERE id = ?', [i + 1, r.id]);
    });
  });

  refresh();
  return { ok: true, message: 'Order updated.' };
}

export async function deleteLogo(formData: FormData): Promise<void> {
  const g = await guard('theme.edit');
  if (!g.ok) return;

  const id = formInt(formData, 'id');
  const row = db.get<{ name: string }>('SELECT name FROM client_logos WHERE id = ?', [id]);
  if (!row) return;

  db.run('DELETE FROM client_logos WHERE id = ?', [id]);
  await audit(g.user, 'logo.delete', 'client_logo', id, row.name);

  refresh();
}
