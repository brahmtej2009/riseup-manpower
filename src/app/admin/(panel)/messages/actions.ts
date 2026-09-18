'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { guard, audit, formStr, formInt, type ActionResult } from '@/lib/admin-actions';

const STATUSES = ['unread', 'read', 'archived'];

export async function setMessageStatus(formData: FormData): Promise<ActionResult> {
  const g = await guard('messages.manage');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const status = formStr(formData, 'status', 12);
  if (!STATUSES.includes(status)) return { ok: false, error: 'That is not a valid status.' };

  const changed = db.run('UPDATE messages SET status = ? WHERE id = ?', [status, id]);
  if (changed.changes === 0) return { ok: false, error: 'That message no longer exists.' };

  revalidatePath('/admin/messages');
  revalidatePath('/admin');
  return { ok: true, message: `Marked as ${status}.` };
}

export async function toggleImportant(formData: FormData): Promise<ActionResult> {
  const g = await guard('messages.manage');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const row = db.get<{ important: number }>('SELECT important FROM messages WHERE id = ?', [id]);
  if (!row) return { ok: false, error: 'That message no longer exists.' };

  db.run('UPDATE messages SET important = ? WHERE id = ?', [row.important ? 0 : 1, id]);
  revalidatePath('/admin/messages');
  return { ok: true, message: row.important ? 'Flag removed.' : 'Flagged as important.' };
}

export async function saveMessageNote(formData: FormData): Promise<ActionResult> {
  const g = await guard('messages.manage');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const note = formStr(formData, 'admin_note', 2000);

  const changed = db.run('UPDATE messages SET admin_note = ? WHERE id = ?', [note, id]);
  if (changed.changes === 0) return { ok: false, error: 'That message no longer exists.' };

  await audit(g.user, 'message.note', 'message', id, note.slice(0, 80));
  revalidatePath('/admin/messages');
  return { ok: true, message: 'Note saved.' };
}

export async function deleteMessage(formData: FormData): Promise<ActionResult> {
  const g = await guard('messages.delete');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const row = db.get<{ name: string; subject: string }>(
    'SELECT name, subject FROM messages WHERE id = ?',
    [id]
  );
  if (!row) return { ok: false, error: 'That message has already been deleted.' };

  db.run('DELETE FROM messages WHERE id = ?', [id]);
  await audit(g.user, 'message.delete', 'message', id, `${row.name}: ${row.subject}`);

  revalidatePath('/admin/messages');
  revalidatePath('/admin');
  return { ok: true, message: 'Message deleted.' };
}

/** Marks every unread message as read. */
export async function markAllRead(): Promise<ActionResult> {
  const g = await guard('messages.manage');
  if (!g.ok) return g;

  const result = db.run("UPDATE messages SET status = 'read' WHERE status = 'unread'");
  revalidatePath('/admin/messages');
  revalidatePath('/admin');

  return {
    ok: true,
    message: result.changes > 0 ? `${result.changes} message(s) marked as read.` : 'Nothing was unread.',
  };
}
