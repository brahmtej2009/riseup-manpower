'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { guard, audit, formStr, formInt, formBool, type ActionResult } from '@/lib/admin-actions';
import { slugify } from '@/lib/utils';

function refresh() {
  revalidatePath('/admin/services');
  revalidatePath('/services');
  revalidatePath('/');
}

/** Makes sure a service slug is unique, since it is used as a page anchor. */
function uniqueServiceSlug(base: string, ignoreId?: number): string {
  const clean = base || 'service';
  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? clean : `${clean}-${i + 1}`;
    const row = db.get<{ id: number }>('SELECT id FROM services WHERE slug = ?', [candidate]);
    if (!row || row.id === ignoreId) return candidate;
  }
  return `${clean}-${Date.now().toString().slice(-5)}`;
}

export async function saveService(formData: FormData): Promise<ActionResult> {
  const g = await guard('services.edit');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const title = formStr(formData, 'title', 120);
  if (title.length < 2) {
    return { ok: false, error: 'Give the service a title.', fields: { title: 'A title is required' } };
  }

  const points = formStr(formData, 'points', 1500)
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 10);

  const values = [
    title,
    formStr(formData, 'summary', 300),
    formStr(formData, 'description', 2000),
    formStr(formData, 'icon', 40) || 'Briefcase',
    JSON.stringify(points),
    formBool(formData, 'is_visible') ? 1 : 0,
  ];

  if (id) {
    const existing = db.get<{ slug: string; title: string }>(
      'SELECT slug, title FROM services WHERE id = ?',
      [id]
    );
    if (!existing) return { ok: false, error: 'That service no longer exists.' };

    // The slug is a link anchor, so only change it if the title changed.
    const slug = existing.title === title ? existing.slug : uniqueServiceSlug(slugify(title), id);

    db.run(
      `UPDATE services
          SET slug = ?, title = ?, summary = ?, description = ?, icon = ?, points = ?,
              is_visible = ?, updated_at = datetime('now')
        WHERE id = ?`,
      [slug, ...values, id]
    );
    await audit(g.user, 'service.update', 'service', id, title);
  } else {
    const nextOrder =
      (db.scalar<number>('SELECT COALESCE(MAX(sort_order), 0) AS n FROM services') ?? 0) + 1;
    const info = db.run(
      `INSERT INTO services (slug, title, summary, description, icon, points, is_visible, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uniqueServiceSlug(slugify(title)), ...values, nextOrder]
    );
    await audit(g.user, 'service.create', 'service', info.lastInsertRowid, title);
  }

  refresh();
  return { ok: true, message: id ? 'Service updated.' : 'Service added to the website.' };
}

export async function deleteService(formData: FormData): Promise<ActionResult> {
  const g = await guard('services.delete');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const row = db.get<{ title: string }>('SELECT title FROM services WHERE id = ?', [id]);
  if (!row) return { ok: false, error: 'That service has already been removed.' };

  db.run('DELETE FROM services WHERE id = ?', [id]);
  await audit(g.user, 'service.delete', 'service', id, row.title);

  refresh();
  return { ok: true, message: `"${row.title}" has been removed.` };
}

export async function toggleServiceVisibility(formData: FormData): Promise<ActionResult> {
  const g = await guard('services.edit');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const row = db.get<{ is_visible: number }>('SELECT is_visible FROM services WHERE id = ?', [id]);
  if (!row) return { ok: false, error: 'That service no longer exists.' };

  db.run("UPDATE services SET is_visible = ?, updated_at = datetime('now') WHERE id = ?", [
    row.is_visible ? 0 : 1,
    id,
  ]);

  refresh();
  return { ok: true, message: row.is_visible ? 'Hidden from the website.' : 'Now shown on the website.' };
}

export async function moveService(formData: FormData): Promise<ActionResult> {
  const g = await guard('services.edit');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const direction = formStr(formData, 'direction', 4) === 'up' ? 'up' : 'down';

  const all = db.all<{ id: number }>('SELECT id FROM services ORDER BY sort_order, id');
  const index = all.findIndex((s) => s.id === id);
  if (index === -1) return { ok: false, error: 'That service no longer exists.' };

  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= all.length) {
    return { ok: true, message: 'Already at the end of the list.' };
  }

  const reordered = [...all];
  [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];

  db.tx(() => {
    reordered.forEach((s, i) => {
      db.run('UPDATE services SET sort_order = ? WHERE id = ?', [i + 1, s.id]);
    });
  });

  refresh();
  return { ok: true, message: 'Order updated.' };
}
