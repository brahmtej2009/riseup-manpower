'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { guard, audit, formStr, formInt, type ActionResult } from '@/lib/admin-actions';
import { can } from '@/lib/permissions';
import { nextRef } from '@/lib/server-utils';

const CONTACT_STATUSES = ['new', 'in_progress', 'placed', 'on_hold', 'closed'];

export async function updateContact(formData: FormData): Promise<ActionResult> {
  const g = await guard('contacts.edit');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const contact = db.get<{ ref: string; type: string; status: string }>(
    'SELECT ref, type, status FROM contacts WHERE id = ?',
    [id]
  );
  if (!contact) return { ok: false, error: 'That contact no longer exists.' };

  const status = formStr(formData, 'status', 20);
  if (!CONTACT_STATUSES.includes(status)) {
    return { ok: false, error: 'That is not a valid status.' };
  }

  const name = formStr(formData, 'name', 120);
  if (name.length < 2) {
    return { ok: false, error: 'A name is required.', fields: { name: 'Enter a name' } };
  }

  const tags = formStr(formData, 'tags', 300)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);

  // A candidate is only counted in the public "placed" figure once the status
  // says so; moving them back off placed clears the date again.
  const placedClause =
    status === 'placed'
      ? "placed_at = COALESCE(placed_at, datetime('now'))"
      : 'placed_at = NULL';

  db.run(
    `UPDATE contacts
        SET name = ?, email = ?, phone = ?, alt_phone = ?, city = ?, state = ?,
            headline = ?, status = ?, tags = ?, ${placedClause},
            updated_at = datetime('now')
      WHERE id = ?`,
    [
      name,
      formStr(formData, 'email', 160),
      formStr(formData, 'phone', 25),
      formStr(formData, 'alt_phone', 25),
      formStr(formData, 'city', 80),
      formStr(formData, 'state', 80),
      formStr(formData, 'headline', 160),
      status,
      JSON.stringify(tags),
      id,
    ]
  );

  await audit(
    g.user,
    'contact.update',
    'contact',
    id,
    contact.status !== status ? `${contact.ref}: ${contact.status} -> ${status}` : contact.ref
  );

  revalidatePath(`/admin/contacts/${id}`);
  revalidatePath('/admin/contacts/employers');
  revalidatePath('/admin/contacts/candidates');

  return { ok: true, message: 'Contact updated.' };
}

export async function deleteContact(formData: FormData): Promise<void> {
  const g = await guard('contacts.delete');
  if (!g.ok) return;

  const id = formInt(formData, 'id');
  const contact = db.get<{ ref: string; type: string }>(
    'SELECT ref, type FROM contacts WHERE id = ?',
    [id]
  );
  if (!contact) return;

  // Notes are removed with the contact by the foreign key; the original
  // submission is kept so there is still a record of what was sent.
  db.run('DELETE FROM contacts WHERE id = ?', [id]);
  db.run('UPDATE submissions SET contact_id = NULL WHERE contact_id = ?', [id]);

  await audit(g.user, 'contact.delete', 'contact', id, contact.ref);
  revalidatePath('/admin/contacts/employers');
  revalidatePath('/admin/contacts/candidates');
  redirect(contact.type === 'employer' ? '/admin/contacts/employers' : '/admin/contacts/candidates');
}

// ---------------------------------------------------------------------------
// Private notes
// ---------------------------------------------------------------------------

export async function addNote(formData: FormData): Promise<ActionResult> {
  const g = await guard('notes.create');
  if (!g.ok) return g;

  const contactId = formInt(formData, 'contact_id');
  const body = formStr(formData, 'body', 4000);

  if (body.length < 2) {
    return { ok: false, error: 'Write something before saving the note.' };
  }
  if (!db.get('SELECT 1 AS x FROM contacts WHERE id = ?', [contactId])) {
    return { ok: false, error: 'That contact no longer exists.' };
  }

  db.run(
    `INSERT INTO contact_notes (contact_id, user_id, author_name, body, pinned)
     VALUES (?, ?, ?, ?, ?)`,
    [contactId, g.user.id, g.user.full_name || g.user.username, body, formData.get('pinned') ? 1 : 0]
  );

  await audit(g.user, 'note.create', 'contact', contactId, body.slice(0, 80));
  revalidatePath(`/admin/contacts/${contactId}`);

  return { ok: true, message: 'Note added.' };
}

export async function deleteNote(formData: FormData): Promise<ActionResult> {
  const g = await guard('notes.view');
  if (!g.ok) return g;

  const noteId = formInt(formData, 'note_id');
  const note = db.get<{ id: number; user_id: number | null; contact_id: number }>(
    'SELECT id, user_id, contact_id FROM contact_notes WHERE id = ?',
    [noteId]
  );
  if (!note) return { ok: false, error: 'That note has already been removed.' };

  // You may delete your own note with notes.delete_own; deleting somebody
  // else's needs notes.delete_any.
  const isOwn = note.user_id === g.user.id;
  const allowed = isOwn ? can(g.user, 'notes.delete_own') || can(g.user, 'notes.delete_any')
                        : can(g.user, 'notes.delete_any');

  if (!allowed) {
    return {
      ok: false,
      error: isOwn
        ? 'You do not have permission to delete notes.'
        : 'Only a senior administrator can delete another person’s note.',
    };
  }

  db.run('DELETE FROM contact_notes WHERE id = ?', [noteId]);
  await audit(g.user, 'note.delete', 'contact', note.contact_id, `note ${noteId}`);
  revalidatePath(`/admin/contacts/${note.contact_id}`);

  return { ok: true, message: 'Note deleted.' };
}

export async function toggleNotePin(formData: FormData): Promise<ActionResult> {
  const g = await guard('notes.create');
  if (!g.ok) return g;

  const noteId = formInt(formData, 'note_id');
  const note = db.get<{ contact_id: number; pinned: number }>(
    'SELECT contact_id, pinned FROM contact_notes WHERE id = ?',
    [noteId]
  );
  if (!note) return { ok: false, error: 'That note has already been removed.' };

  db.run('UPDATE contact_notes SET pinned = ? WHERE id = ?', [note.pinned ? 0 : 1, noteId]);
  revalidatePath(`/admin/contacts/${note.contact_id}`);

  return { ok: true, message: note.pinned ? 'Note unpinned.' : 'Note pinned to the top.' };
}

// ---------------------------------------------------------------------------

export async function bulkContactAction(formData: FormData): Promise<ActionResult> {
  const operation = formStr(formData, 'operation', 20);
  const g = await guard(operation === 'delete' ? 'contacts.delete' : 'contacts.edit');
  if (!g.ok) return g;

  const ids = formData
    .getAll('ids')
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!ids.length) return { ok: false, error: 'Nothing was selected.' };

  const placeholders = ids.map(() => '?').join(',');

  if (operation === 'delete') {
    db.run(`DELETE FROM contacts WHERE id IN (${placeholders})`, ids);
  } else if (CONTACT_STATUSES.includes(operation)) {
    db.run(
      `UPDATE contacts SET status = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`,
      [operation, ...ids]
    );
  } else {
    return { ok: false, error: 'That action is not recognised.' };
  }

  await audit(g.user, `contact.bulk_${operation}`, 'contact', ids.join(','), `${ids.length} row(s)`);
  revalidatePath('/admin/contacts/employers');
  revalidatePath('/admin/contacts/candidates');

  return { ok: true, message: `${ids.length} contact${ids.length === 1 ? '' : 's'} updated.` };
}

/**
 * Sends an approved contact back to the New Submissions queue.
 *
 * This undoes an approval: the contact record and its private notes are
 * removed, and the original submission goes back to "new" so it can be
 * reviewed again. If the original submission was deleted at some point, one is
 * recreated from the contact so nothing is lost.
 *
 * It is deliberately destructive of the notes, which is why the screen makes
 * the person type the word out before it will run.
 */
export async function returnToSubmissions(formData: FormData): Promise<void> {
  const g = await guard('submissions.approve');
  if (!g.ok) return;

  const id = formInt(formData, 'id');
  if (formStr(formData, 'confirm', 20).toUpperCase() !== 'SEND BACK') return;

  const contact = db.get<{
    id: number; ref: string; type: 'employer' | 'candidate'; name: string; email: string;
    phone: string; city: string; state: string; headline: string; data: string;
    resume_path: string | null; photo_path: string | null; submission_id: number | null;
  }>('SELECT * FROM contacts WHERE id = ?', [id]);

  if (!contact) return;

  const noteCount =
    db.scalar<number>('SELECT COUNT(*) AS n FROM contact_notes WHERE contact_id = ?', [id]) ?? 0;

  db.tx(() => {
    const existing = contact.submission_id
      ? db.get<{ id: number }>('SELECT id FROM submissions WHERE id = ?', [contact.submission_id])
      : undefined;

    if (existing) {
      db.run(
        `UPDATE submissions
            SET status = 'new', contact_id = NULL, reviewed_by = NULL, reviewed_at = NULL,
                review_note = ?, updated_at = datetime('now')
          WHERE id = ?`,
        [`Sent back from contacts by ${g.user.full_name || g.user.username}`, existing.id]
      );
    } else {
      // The original was deleted, so rebuild one from the contact record.
      db.run(
        `INSERT INTO submissions
           (ref, type, status, name, email, phone, city, state, headline, data,
            resume_path, photo_path, review_note)
         VALUES (?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nextRef('submissions', contact.type === 'employer' ? 'EMP' : 'CAN'),
          contact.type, contact.name, contact.email, contact.phone, contact.city,
          contact.state, contact.headline, contact.data, contact.resume_path,
          contact.photo_path,
          `Rebuilt from contact ${contact.ref} when it was sent back`,
        ]
      );
    }

    // Notes belong to the contact and go with it.
    db.run('DELETE FROM contacts WHERE id = ?', [id]);
  });

  await audit(
    g.user,
    'contact.return_to_submissions',
    'contact',
    id,
    `${contact.ref} sent back for review, ${noteCount} note(s) removed`
  );

  revalidatePath('/admin/submissions');
  revalidatePath('/admin/contacts/employers');
  revalidatePath('/admin/contacts/candidates');
  revalidatePath('/admin');

  redirect(contact.type === 'employer' ? '/admin/contacts/employers' : '/admin/contacts/candidates');
}
