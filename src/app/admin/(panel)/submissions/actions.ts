'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { guard, audit, formStr, formInt, type ActionResult } from '@/lib/admin-actions';
import { nextRef } from '@/lib/server-utils';

/**
 * Approving a submission turns it into a permanent contact.
 *
 * The whole thing runs in one transaction: either the contact is created and
 * the submission is marked approved and linked to it, or nothing changes.
 */
export async function approveSubmission(formData: FormData): Promise<ActionResult> {
  const g = await guard('submissions.approve');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const note = formStr(formData, 'note', 1000);

  const submission = db.get<{
    id: number; ref: string; type: 'employer' | 'candidate'; status: string;
    name: string; email: string; phone: string; city: string; state: string;
    headline: string; data: string; resume_path: string | null; photo_path: string | null;
    contact_id: number | null;
  }>('SELECT * FROM submissions WHERE id = ?', [id]);

  if (!submission) return { ok: false, error: 'That submission no longer exists.' };
  if (submission.status === 'approved' && submission.contact_id) {
    return { ok: false, error: 'This one has already been approved.' };
  }

  try {
    const contactId = db.tx(() => {
      const ref = nextRef('contacts', submission.type === 'employer' ? 'CE' : 'CC');

      // Alternate phone lives inside the submitted JSON rather than a column.
      let altPhone = '';
      try {
        altPhone = String(JSON.parse(submission.data)?.alt_phone ?? '');
      } catch {
        altPhone = '';
      }

      const info = db.run(
        `INSERT INTO contacts
           (ref, type, status, name, email, phone, alt_phone, city, state, headline, data,
            resume_path, photo_path, submission_id, approved_by, approved_at)
         VALUES (?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          ref, submission.type, submission.name, submission.email, submission.phone, altPhone,
          submission.city, submission.state, submission.headline, submission.data,
          submission.resume_path, submission.photo_path, submission.id, g.user.id,
        ]
      );

      db.run(
        `UPDATE submissions
            SET status = 'approved', contact_id = ?, reviewed_by = ?,
                reviewed_at = datetime('now'), review_note = ?, updated_at = datetime('now')
          WHERE id = ?`,
        [info.lastInsertRowid, g.user.id, note || null, id]
      );

      return info.lastInsertRowid;
    });

    await audit(g.user, 'submission.approve', 'submission', id, `${submission.ref} -> contact ${contactId}`);

    revalidatePath('/admin/submissions');
    revalidatePath('/admin/contacts/employers');
    revalidatePath('/admin/contacts/candidates');
    revalidatePath('/admin');

    return { ok: true, message: `Approved. ${submission.name} is now in contacts.` };
  } catch (err) {
    console.error('[approveSubmission]', err);
    return { ok: false, error: 'The submission could not be approved. Nothing was changed.' };
  }
}

export async function rejectSubmission(formData: FormData): Promise<ActionResult> {
  const g = await guard('submissions.reject');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const note = formStr(formData, 'note', 1000);

  const row = db.get<{ ref: string }>('SELECT ref FROM submissions WHERE id = ?', [id]);
  if (!row) return { ok: false, error: 'That submission no longer exists.' };

  db.run(
    `UPDATE submissions
        SET status = 'rejected', reviewed_by = ?, reviewed_at = datetime('now'),
            review_note = ?, updated_at = datetime('now')
      WHERE id = ?`,
    [g.user.id, note || null, id]
  );

  await audit(g.user, 'submission.reject', 'submission', id, `${row.ref}: ${note}`);
  revalidatePath('/admin/submissions');
  return { ok: true, message: 'Marked as rejected. It is kept on record.' };
}

export async function markReviewing(formData: FormData): Promise<ActionResult> {
  const g = await guard('submissions.view');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  db.run(
    `UPDATE submissions SET status = 'reviewing', reviewed_by = ?, updated_at = datetime('now')
      WHERE id = ? AND status = 'new'`,
    [g.user.id, id]
  );
  revalidatePath('/admin/submissions');
  return { ok: true, message: 'Marked as under review.' };
}

export async function deleteSubmission(formData: FormData): Promise<void> {
  const g = await guard('submissions.delete');
  if (!g.ok) return;

  const id = formInt(formData, 'id');
  const row = db.get<{ ref: string }>('SELECT ref FROM submissions WHERE id = ?', [id]);
  if (!row) return;

  // The contact created from it, if any, is deliberately left alone.
  db.run('DELETE FROM submissions WHERE id = ?', [id]);
  await audit(g.user, 'submission.delete', 'submission', id, row.ref);

  revalidatePath('/admin/submissions');
  redirect('/admin/submissions');
}

/** Approve or reject several at once from the list screen. */
export async function bulkSubmissionAction(formData: FormData): Promise<ActionResult> {
  const operation = formStr(formData, 'operation', 20);
  const permission =
    operation === 'approve' ? 'submissions.approve'
      : operation === 'reject' ? 'submissions.reject'
      : 'submissions.delete';

  const g = await guard(permission);
  if (!g.ok) return g;

  const ids = formData
    .getAll('ids')
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (ids.length === 0) return { ok: false, error: 'Nothing was selected.' };

  let done = 0;
  let failed = 0;

  for (const id of ids) {
    const one = new FormData();
    one.set('id', String(id));
    if (operation === 'approve') {
      const r = await approveSubmission(one);
      r.ok ? done++ : failed++;
    } else if (operation === 'reject') {
      one.set('note', 'Rejected in bulk');
      const r = await rejectSubmission(one);
      r.ok ? done++ : failed++;
    } else {
      db.run('DELETE FROM submissions WHERE id = ?', [id]);
      done++;
    }
  }

  await audit(g.user, `submission.bulk_${operation}`, 'submission', ids.join(','), `${done} done, ${failed} failed`);
  revalidatePath('/admin/submissions');

  return {
    ok: true,
    message:
      failed > 0
        ? `${done} processed, ${failed} could not be (they may already have been handled).`
        : `${done} submission${done === 1 ? '' : 's'} processed.`,
  };
}
