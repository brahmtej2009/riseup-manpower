import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, Phone, Mail, Trash2, Save, StickyNote, Pin, PinOff,
  Lock, ExternalLink, Plus, Undo2,
} from 'lucide-react';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { formatDateTime, timeAgo, parseJson, telLink, whatsappLink } from '@/lib/utils';
import { PageTitle, Panel, StatusBadge, DetailList } from '@/components/admin/ui';
import { SubmittedData } from '@/components/admin/SubmittedData';
import { DocumentViewer } from '@/components/admin/DocumentViewer';
import { ActionForm, ConfirmForm } from '@/components/admin/BulkForm';
import { SubmitButton, InfoNote } from '@/components/admin/interactive';
import {
  updateContact, deleteContact, addNote, deleteNote, toggleNotePin, returnToSubmissions,
} from '../actions';

export const metadata = { title: 'Contact' };

interface Contact {
  id: number;
  ref: string;
  type: 'employer' | 'candidate';
  status: string;
  name: string;
  email: string;
  phone: string;
  alt_phone: string;
  city: string;
  state: string;
  headline: string;
  data: string;
  tags: string;
  resume_path: string | null;
  photo_path: string | null;
  submission_id: number | null;
  approved_at: string | null;
  placed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Note {
  id: number;
  user_id: number | null;
  author_name: string;
  body: string;
  pinned: number;
  created_at: string;
}

const STATUS_OPTIONS: [string, string][] = [
  ['new', 'New'],
  ['in_progress', 'In progress'],
  ['placed', 'Placed / fulfilled'],
  ['on_hold', 'On hold'],
  ['closed', 'Closed'],
];

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission('contacts.view');
  const { id } = await params;

  const contact = db.get<Contact>('SELECT * FROM contacts WHERE id = ?', [Number(id)]);
  if (!contact) notFound();

  const data = parseJson<Record<string, unknown>>(contact.data, {});
  const tags = parseJson<string[]>(contact.tags, []);
  const editable = can(user, 'contacts.edit');

  const notes = can(user, 'notes.view')
    ? db.all<Note>(
        `SELECT id, user_id, author_name, body, pinned, created_at
           FROM contact_notes WHERE contact_id = ?
          ORDER BY pinned DESC, id DESC`,
        [contact.id]
      )
    : [];

  const backHref = `/admin/contacts/${contact.type === 'employer' ? 'employers' : 'candidates'}`;

  return (
    <>
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {contact.type === 'employer' ? 'employer' : 'candidate'} contacts
      </Link>

      <PageTitle
        title={contact.headline || contact.name}
        subtitle={`${contact.type === 'employer' ? 'Employer' : 'Candidate'} · ${contact.ref}`}
        actions={
          <>
            <StatusBadge status={contact.status} />
            {contact.submission_id && can(user, 'submissions.view') && (
              <Link href={`/admin/submissions/${contact.submission_id}`} className="btn-outline btn-sm">
                <ExternalLink className="h-4 w-4" />
                Original submission
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Editable summary */}
          <Panel title="Contact details" description={editable ? undefined : 'You have read-only access.'}>
            {editable ? (
              <ActionForm action={updateContact} hidden={{ id: contact.id }} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="c-name">
                      {contact.type === 'employer' ? 'Contact person' : 'Full name'}
                    </label>
                    <input id="c-name" name="name" defaultValue={contact.name} className="field" required />
                  </div>
                  <div>
                    <label className="label" htmlFor="c-headline">
                      {contact.type === 'employer' ? 'Company name' : 'Job category'}
                    </label>
                    <input id="c-headline" name="headline" defaultValue={contact.headline} className="field" />
                  </div>
                  <div>
                    <label className="label" htmlFor="c-phone">Phone</label>
                    <input id="c-phone" name="phone" defaultValue={contact.phone} className="field" />
                  </div>
                  <div>
                    <label className="label" htmlFor="c-alt">Alternate phone</label>
                    <input id="c-alt" name="alt_phone" defaultValue={contact.alt_phone} className="field" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor="c-email">Email</label>
                    <input id="c-email" name="email" type="email" defaultValue={contact.email} className="field" />
                  </div>
                  <div>
                    <label className="label" htmlFor="c-city">City</label>
                    <input id="c-city" name="city" defaultValue={contact.city} className="field" />
                  </div>
                  <div>
                    <label className="label" htmlFor="c-state">State</label>
                    <input id="c-state" name="state" defaultValue={contact.state} className="field" />
                  </div>
                  <div>
                    <label className="label" htmlFor="c-status">Status</label>
                    <select id="c-status" name="status" defaultValue={contact.status} className="field">
                      {STATUS_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="c-tags">Tags</label>
                    <input
                      id="c-tags"
                      name="tags"
                      defaultValue={tags.join(', ')}
                      className="field"
                      placeholder="priority, verified, bulk"
                    />
                    <p className="help">Separate with commas.</p>
                  </div>
                </div>

                <SubmitButton className="btn-primary" icon={<Save className="h-4 w-4" />}>
                  Save changes
                </SubmitButton>
              </ActionForm>
            ) : (
              <DetailList
                items={[
                  ['Name', contact.name],
                  ['Phone', contact.phone],
                  ['Alternate phone', contact.alt_phone],
                  ['Email', contact.email],
                  ['Location', [contact.city, contact.state].filter(Boolean).join(', ')],
                  ['Status', <StatusBadge key="s" status={contact.status} />],
                ]}
              />
            )}
          </Panel>

          <Panel title="Full details as submitted">
            <SubmittedData data={data} />
          </Panel>

          {/* Private notes */}
          {can(user, 'notes.view') && (
            <Panel
              title="Private notes"
              description="Internal only - never shown anywhere on the website."
              bodyClassName=""
            >
              <div className="px-5 pt-5">
                <InfoNote>
                  <Lock className="mr-1 inline h-3.5 w-3.5" />
                  Notes are visible to staff with the right permission, and to nobody else.
                </InfoNote>
              </div>

              {can(user, 'notes.create') && (
                <div className="px-5 pt-4">
                  <ActionForm action={addNote} hidden={{ contact_id: contact.id }} className="space-y-3">
                    <textarea
                      name="body"
                      rows={3}
                      required
                      placeholder="What happened? Who did you speak to? What was agreed?"
                      className="field text-sm"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
                        <input
                          type="checkbox"
                          name="pinned"
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                        />
                        Pin to the top
                      </label>
                      <SubmitButton className="btn-primary btn-sm" icon={<Plus className="h-4 w-4" />} pendingLabel="Adding…">
                        Add note
                      </SubmitButton>
                    </div>
                  </ActionForm>
                </div>
              )}

              {notes.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-ink-muted">
                  No notes have been added for this contact yet.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                  {notes.map((note) => {
                    const isOwn = note.user_id === user.id;
                    const canRemove = isOwn
                      ? can(user, 'notes.delete_own') || can(user, 'notes.delete_any')
                      : can(user, 'notes.delete_any');

                    return (
                      <li key={note.id} className="px-5 py-4">
                        <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          {note.pinned === 1 && (
                            <span className="chip bg-amber-50 text-amber-800 ring-amber-600/20">
                              <Pin className="h-3 w-3" strokeWidth={2.5} />
                              Pinned
                            </span>
                          )}
                          <span className="text-sm font-semibold text-ink">{note.author_name}</span>
                          <span className="text-xs text-ink-muted">
                            {timeAgo(note.created_at)} · {formatDateTime(note.created_at)}
                          </span>

                          <span className="ml-auto flex items-center gap-1">
                            {can(user, 'notes.create') && (
                              <ActionForm action={toggleNotePin} hidden={{ note_id: note.id }}>
                                <SubmitButton
                                  className="grid h-7 w-7 place-items-center rounded-lg text-ink-muted transition hover:bg-slate-100 hover:text-ink"
                                  pendingLabel=""
                                  title={note.pinned ? 'Unpin' : 'Pin to the top'}
                                >
                                  {note.pinned ? (
                                    <PinOff className="h-3.5 w-3.5" />
                                  ) : (
                                    <Pin className="h-3.5 w-3.5" />
                                  )}
                                </SubmitButton>
                              </ActionForm>
                            )}
                            {canRemove && (
                              <ConfirmForm
                                action={async (fd) => {
                                  'use server';
                                  await deleteNote(fd);
                                }}
                                hidden={{ note_id: note.id }}
                                title="Delete this note?"
                                message="The note is removed permanently. This cannot be undone."
                                confirmLabel="Delete note"
                                trigger={
                                  <button
                                    type="button"
                                    title="Delete note"
                                    className="grid h-7 w-7 place-items-center rounded-lg text-ink-muted transition hover:bg-rose-50 hover:text-rose-600"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                }
                              />
                            )}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                          {note.body}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Panel title="Get in touch">
            <div className="space-y-2.5">
              {contact.phone && (
                <>
                  <a href={telLink(contact.phone)} className="btn-outline btn-sm w-full justify-start">
                    <Phone className="h-4 w-4" />
                    {contact.phone}
                  </a>
                  <a
                    href={whatsappLink(contact.phone, `Hello ${contact.name}, `)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm w-full justify-start bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    WhatsApp
                  </a>
                </>
              )}
              {contact.alt_phone && (
                <a href={telLink(contact.alt_phone)} className="btn-outline btn-sm w-full justify-start">
                  <Phone className="h-4 w-4" />
                  {contact.alt_phone}
                </a>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="btn-outline btn-sm w-full justify-start"
                >
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{contact.email}</span>
                </a>
              )}
            </div>
          </Panel>

          {(contact.photo_path || contact.resume_path) && (
            <Panel title="Attachments">
              <div className="flex flex-wrap gap-3">
                {contact.photo_path && (
                  <a href={contact.photo_path} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={contact.photo_path}
                      alt=""
                      className="h-24 w-24 rounded-xl border border-slate-200 object-cover transition hover:border-brand-400"
                    />
                  </a>
                )}
                {contact.resume_path && (
                  <DocumentViewer path={contact.resume_path} label="Resume" />
                )}
              </div>
            </Panel>
          )}

          <Panel title="Record">
            <DetailList
              columns={1}
              items={[
                ['Reference', <span key="r" className="font-mono text-xs">{contact.ref}</span>],
                ['Approved', formatDateTime(contact.approved_at)],
                ['Placed on', contact.placed_at ? formatDateTime(contact.placed_at) : null],
                ['Added', formatDateTime(contact.created_at)],
                ['Last updated', formatDateTime(contact.updated_at)],
                ['Notes', notes.length > 0 ? `${notes.length} private note(s)` : null],
              ]}
            />
          </Panel>

          {can(user, 'submissions.approve') && (
            <ConfirmForm
              action={returnToSubmissions}
              hidden={{ id: contact.id, confirm: 'SEND BACK' }}
              tone="warning"
              title="Send this back to New Submissions?"
              message={
                `This undoes the approval. ${contact.name} returns to the New Submissions queue ` +
                `for review, and this contact record is removed` +
                (notes.length > 0
                  ? `, along with its ${notes.length} private note${notes.length === 1 ? '' : 's'}, which cannot be recovered.`
                  : '.')
              }
              confirmLabel="Send back for review"
              confirmWord="SEND BACK"
              trigger={
                <button
                  type="button"
                  className="btn-outline btn-sm w-full text-amber-700 hover:border-amber-400 hover:bg-amber-50"
                >
                  <Undo2 className="h-4 w-4" />
                  Send back to New Submissions
                </button>
              }
            />
          )}

          {can(user, 'contacts.delete') && (
            <ConfirmForm
              action={deleteContact}
              hidden={{ id: contact.id }}
              title="Delete this contact?"
              message="The contact and all of its private notes are removed permanently. The original submission is kept."
              confirmLabel="Delete permanently"
              confirmWord="DELETE"
              trigger={
                <button type="button" className="btn-ghost btn-sm w-full text-rose-600 hover:bg-rose-50">
                  <Trash2 className="h-4 w-4" />
                  Delete this contact
                </button>
              }
            />
          )}
        </div>
      </div>
    </>
  );
}
