import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, Building2, Users, Phone, Mail, MapPin, Calendar, Check, X,
  Trash2, ExternalLink, Eye, Globe,
} from 'lucide-react';
import { DocumentViewer } from '@/components/admin/DocumentViewer';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { formatDateTime, parseJson, telLink, whatsappLink } from '@/lib/utils';
import { PageTitle, Panel, StatusBadge, DetailList } from '@/components/admin/ui';
import { SubmittedData } from '@/components/admin/SubmittedData';
import { ActionForm, ConfirmForm } from '@/components/admin/BulkForm';
import { SubmitButton } from '@/components/admin/interactive';
import { approveSubmission, rejectSubmission, markReviewing, deleteSubmission } from '../actions';

export const metadata = { title: 'Submission' };

interface Submission {
  id: number;
  ref: string;
  type: 'employer' | 'candidate';
  status: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  headline: string;
  data: string;
  resume_path: string | null;
  photo_path: string | null;
  ip: string | null;
  user_agent: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  contact_id: number | null;
  created_at: string;
}

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission('submissions.view');
  const { id } = await params;

  const row = db.get<Submission>('SELECT * FROM submissions WHERE id = ?', [Number(id)]);
  if (!row) notFound();

  const reviewer = row.reviewed_at
    ? db.get<{ full_name: string; username: string }>(
        'SELECT full_name, username FROM users WHERE id = (SELECT reviewed_by FROM submissions WHERE id = ?)',
        [row.id]
      )
    : null;

  const data = parseJson<Record<string, unknown>>(row.data, {});
  const isPending = row.status === 'new' || row.status === 'reviewing';

  return (
    <>
      <Link
        href="/admin/submissions"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to submissions
      </Link>

      <PageTitle
        title={row.headline || row.name}
        subtitle={`${row.type === 'employer' ? 'Employer enquiry' : 'Candidate registration'} · ${row.ref}`}
        actions={
          <>
            <StatusBadge status={row.status} />
            {row.contact_id && can(user, 'contacts.view') && (
              <Link
                href={`/admin/contacts/${row.contact_id}`}
                className="btn-outline btn-sm"
              >
                <ExternalLink className="h-4 w-4" />
                Open the contact
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title="What was submitted">
            <SubmittedData data={data} />
          </Panel>

          {(row.resume_path || row.photo_path) && (
            <Panel title="Attachments">
              <div className="flex flex-wrap gap-4">
                {row.photo_path && (
                  <a
                    href={row.photo_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={row.photo_path}
                      alt="Applicant photograph"
                      className="h-32 w-32 rounded-xl border border-slate-200 object-cover transition group-hover:border-brand-400"
                    />
                    <span className="mt-1.5 flex items-center gap-1 text-xs text-ink-muted">
                      <Eye className="h-3 w-3" />
                      Photograph
                    </span>
                  </a>
                )}

                {row.resume_path && <DocumentViewer path={row.resume_path} />}
              </div>
            </Panel>
          )}
        </div>

        <div className="space-y-5">
          {/* Actions */}
          {isPending && (can(user, 'submissions.approve') || can(user, 'submissions.reject')) && (
            <Panel title="Review">
              {can(user, 'submissions.approve') && (
                <ActionForm action={approveSubmission} hidden={{ id: row.id }} className="space-y-3">
                  <p className="text-sm leading-relaxed text-ink-soft">
                    Approving this creates a permanent contact record with all the details above.
                  </p>
                  <textarea
                    name="note"
                    rows={2}
                    placeholder="Optional note for the record"
                    className="field text-sm"
                  />
                  <SubmitButton
                    className="btn w-full bg-emerald-600 text-white hover:bg-emerald-700"
                    pendingLabel="Approving…"
                    icon={<Check className="h-4 w-4" />}
                  >
                    Approve and add to contacts
                  </SubmitButton>
                </ActionForm>
              )}

              {can(user, 'submissions.reject') && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <ActionForm action={rejectSubmission} hidden={{ id: row.id }} className="space-y-3">
                    <textarea
                      name="note"
                      rows={2}
                      placeholder="Why is this being rejected?"
                      className="field text-sm"
                    />
                    <SubmitButton className="btn-outline w-full" pendingLabel="Working…" icon={<X className="h-4 w-4" />}>
                      Reject
                    </SubmitButton>
                  </ActionForm>
                </div>
              )}

              {row.status === 'new' && (
                <ActionForm action={markReviewing} hidden={{ id: row.id }} className="mt-3">
                  <SubmitButton className="btn-ghost btn-sm w-full" pendingLabel="Working…">
                    Mark as under review
                  </SubmitButton>
                </ActionForm>
              )}
            </Panel>
          )}

          {/* Quick contact */}
          <Panel title="Get in touch">
            <div className="space-y-2.5">
              {row.phone && (
                <>
                  <a href={telLink(row.phone)} className="btn-outline btn-sm w-full justify-start">
                    <Phone className="h-4 w-4" />
                    {row.phone}
                  </a>
                  <a
                    href={whatsappLink(row.phone, `Hello ${row.name}, regarding your registration ${row.ref}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm w-full justify-start bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    WhatsApp
                  </a>
                </>
              )}
              {row.email && (
                <a
                  href={`mailto:${row.email}?subject=${encodeURIComponent(`Your registration ${row.ref}`)}`}
                  className="btn-outline btn-sm w-full justify-start"
                >
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{row.email}</span>
                </a>
              )}
            </div>
          </Panel>

          <Panel title="Record">
            <DetailList
              columns={1}
              items={[
                ['Reference', <span key="r" className="font-mono text-xs">{row.ref}</span>],
                ['Type', row.type === 'employer' ? 'Employer' : 'Candidate'],
                [
                  'Location',
                  [row.city, row.state].filter(Boolean).join(', ') || null,
                ],
                ['Received', formatDateTime(row.created_at)],
                reviewer
                  ? ['Reviewed by', `${reviewer.full_name || reviewer.username} · ${formatDateTime(row.reviewed_at)}`]
                  : ['Reviewed', null],
                [
                  'Review note',
                  row.review_note ? (
                    <span key="n" className="block whitespace-pre-wrap">{row.review_note}</span>
                  ) : null,
                ],
                can(user, 'system.logs')
                  ? ['From', <span key="ip" className="font-mono text-xs">{row.ip ?? 'unknown'}</span>]
                  : ['From', null],
              ]}
            />
          </Panel>

          {can(user, 'submissions.delete') && (
            <ConfirmForm
              action={deleteSubmission}
              hidden={{ id: row.id }}
              title="Delete this submission?"
              message="The submission and its uploaded files are removed permanently. If it has already been approved, the contact record is kept."
              confirmLabel="Delete permanently"
              confirmWord="DELETE"
              trigger={
                <button type="button" className="btn-ghost btn-sm w-full text-rose-600 hover:bg-rose-50">
                  <Trash2 className="h-4 w-4" />
                  Delete this submission
                </button>
              }
            />
          )}
        </div>
      </div>
    </>
  );
}
