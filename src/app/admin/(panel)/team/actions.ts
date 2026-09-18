'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { guard, audit, formStr, formInt, formBool, type ActionResult } from '@/lib/admin-actions';

/** Refreshes every public page that shows the team row. */
function refresh() {
  revalidatePath('/admin/team');
  revalidatePath('/team');
  revalidatePath('/about');
  revalidatePath('/');
}

export async function saveTeamMember(formData: FormData): Promise<ActionResult> {
  const g = await guard('team.edit');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const name = formStr(formData, 'name', 120);

  if (name.length < 2) {
    return { ok: false, error: 'Enter the person’s name.', fields: { name: 'A name is required' } };
  }

  const values = [
    name,
    formStr(formData, 'designation', 120),
    formStr(formData, 'bio', 600),
    formStr(formData, 'photo_path', 300) || null,
    formStr(formData, 'email', 160),
    formStr(formData, 'phone', 25),
    formStr(formData, 'linkedin', 300),
    formBool(formData, 'is_visible') ? 1 : 0,
  ];

  if (id) {
    const exists = db.get('SELECT 1 AS x FROM team_members WHERE id = ?', [id]);
    if (!exists) return { ok: false, error: 'That team member no longer exists.' };

    db.run(
      `UPDATE team_members
          SET name = ?, designation = ?, bio = ?, photo_path = ?, email = ?, phone = ?,
              linkedin = ?, is_visible = ?, updated_at = datetime('now')
        WHERE id = ?`,
      [...values, id]
    );
    await audit(g.user, 'team.update', 'team_member', id, name);
  } else {
    const nextOrder =
      (db.scalar<number>('SELECT COALESCE(MAX(sort_order), 0) AS n FROM team_members') ?? 0) + 1;
    const info = db.run(
      `INSERT INTO team_members
         (name, designation, bio, photo_path, email, phone, linkedin, is_visible, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [...values, nextOrder]
    );
    await audit(g.user, 'team.create', 'team_member', info.lastInsertRowid, name);
  }

  refresh();
  return { ok: true, message: id ? 'Team member updated.' : `${name} has been added to the website.` };
}

export async function deleteTeamMember(formData: FormData): Promise<ActionResult> {
  const g = await guard('team.delete');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const row = db.get<{ name: string }>('SELECT name FROM team_members WHERE id = ?', [id]);
  if (!row) return { ok: false, error: 'That team member has already been removed.' };

  db.run('DELETE FROM team_members WHERE id = ?', [id]);
  await audit(g.user, 'team.delete', 'team_member', id, row.name);

  refresh();
  return { ok: true, message: `${row.name} has been removed from the website.` };
}

export async function toggleTeamVisibility(formData: FormData): Promise<ActionResult> {
  const g = await guard('team.edit');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const row = db.get<{ is_visible: number; name: string }>(
    'SELECT is_visible, name FROM team_members WHERE id = ?',
    [id]
  );
  if (!row) return { ok: false, error: 'That team member no longer exists.' };

  db.run("UPDATE team_members SET is_visible = ?, updated_at = datetime('now') WHERE id = ?", [
    row.is_visible ? 0 : 1,
    id,
  ]);

  refresh();
  return {
    ok: true,
    message: row.is_visible ? `${row.name} is now hidden.` : `${row.name} is now shown on the website.`,
  };
}

/** Moves a member one place up or down in the published order. */
export async function moveTeamMember(formData: FormData): Promise<ActionResult> {
  const g = await guard('team.edit');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const direction = formStr(formData, 'direction', 4) === 'up' ? 'up' : 'down';

  const all = db.all<{ id: number }>('SELECT id FROM team_members ORDER BY sort_order, id');
  const index = all.findIndex((m) => m.id === id);
  if (index === -1) return { ok: false, error: 'That team member no longer exists.' };

  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= all.length) {
    return { ok: true, message: 'Already at the end of the list.' };
  }

  // Rewrite the whole order so it stays a clean 1..n with no gaps.
  const reordered = [...all];
  [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];

  db.tx(() => {
    reordered.forEach((m, i) => {
      db.run('UPDATE team_members SET sort_order = ? WHERE id = ?', [i + 1, m.id]);
    });
  });

  refresh();
  return { ok: true, message: 'Order updated.' };
}
