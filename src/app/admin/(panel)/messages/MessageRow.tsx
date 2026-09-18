'use client';

import { useState } from 'react';
import { Star, Archive, Trash2, Phone, Save, MailOpen, Mail, ChevronDown } from 'lucide-react';
import { cn, formatDateTime, timeAgo, telLink } from '@/lib/utils';
import { ActionForm, ConfirmForm } from '@/components/admin/BulkForm';
import { SubmitButton } from '@/components/admin/interactive';
import type { ActionResult } from '@/lib/admin-actions';

export interface MessageRecord {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  body: string;
  status: string;
  important: number;
  admin_note: string;
  created_at: string;
}

/**
 * One row in the inbox, read the way an email client reads.
 *
 * Closed by default. An unread message sits on white and is set in bold; once
 * it has been read it drops back to grey, so what still needs attention is
 * obvious at a glance down the list.
 */
export function MessageRow({
  message,
  manage,
  canDelete,
  setStatus,
  toggleImportant,
  saveNote,
  remove,
}: {
  message: MessageRecord;
  manage: boolean;
  canDelete: boolean;
  setStatus: (fd: FormData) => Promise<ActionResult>;
  toggleImportant: (fd: FormData) => Promise<ActionResult>;
  saveNote: (fd: FormData) => Promise<ActionResult>;
  remove: (fd: FormData) => Promise<ActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const unread = message.status === 'unread';

  return (
    <li
      className={cn(
        'border-b border-slate-200 last:border-b-0',
        unread ? 'bg-white' : 'bg-slate-50/80',
        open && 'bg-white shadow-[inset_3px_0_0_0_rgb(var(--brand-600))]'
      )}
    >
      {/* Summary line */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-100/70 sm:px-5"
        aria-expanded={open}
      >
        <span className="w-4 shrink-0">
          {message.important === 1 ? (
            <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
          ) : unread ? (
            <span className="block h-2 w-2 rounded-full bg-brand-600" />
          ) : null}
        </span>

        <span
          className={cn(
            'w-32 shrink-0 truncate text-sm sm:w-44',
            unread ? 'font-semibold text-ink' : 'font-normal text-ink-soft'
          )}
        >
          {message.name}
        </span>

        <span className="min-w-0 flex-1 truncate text-sm">
          <span className={cn(unread ? 'font-semibold text-ink' : 'text-ink-soft')}>
            {message.subject}
          </span>
          <span className="ml-2 hidden text-ink-muted sm:inline">
            {message.body.slice(0, 90)}
          </span>
        </span>

        <span
          className={cn(
            'shrink-0 text-xs',
            unread ? 'font-semibold text-ink' : 'text-ink-muted'
          )}
          title={formatDateTime(message.created_at)}
        >
          {timeAgo(message.created_at)}
        </span>

        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-ink-muted transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* Opened message */}
      {open && (
        <div className="space-y-4 border-t border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <a href={`mailto:${message.email}`} className="font-medium text-brand-700 hover:underline">
              {message.email}
            </a>
            {message.phone && (
              <a
                href={telLink(message.phone)}
                className="inline-flex items-center gap-1.5 text-ink-soft hover:text-brand-700"
              >
                <Phone className="h-3.5 w-3.5" />
                {message.phone}
              </a>
            )}
            <span className="text-ink-muted">{formatDateTime(message.created_at)}</span>
          </div>

          <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-ink-soft">
            {message.body}
          </p>

          {manage && (
            <>
              <ActionForm action={saveNote} hidden={{ id: message.id }} className="space-y-2">
                <label className="label text-xs">Internal note</label>
                <textarea
                  name="admin_note"
                  defaultValue={message.admin_note}
                  rows={2}
                  maxLength={2000}
                  placeholder="What was done about this? Not shown to the sender."
                  className="field text-sm"
                />
                <SubmitButton className="btn-outline btn-sm" icon={<Save className="h-4 w-4" />}>
                  Save the note
                </SubmitButton>
              </ActionForm>

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <ActionForm
                  action={setStatus}
                  hidden={{ id: message.id, status: unread ? 'read' : 'unread' }}
                >
                  <SubmitButton
                    className="btn-outline btn-sm"
                    pendingLabel="…"
                    icon={
                      unread ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />
                    }
                  >
                    Mark as {unread ? 'read' : 'unread'}
                  </SubmitButton>
                </ActionForm>

                <ActionForm action={toggleImportant} hidden={{ id: message.id }}>
                  <SubmitButton
                    className="btn-outline btn-sm"
                    pendingLabel="…"
                    icon={<Star className="h-4 w-4" />}
                  >
                    {message.important ? 'Remove the flag' : 'Flag as important'}
                  </SubmitButton>
                </ActionForm>

                {message.status !== 'archived' && (
                  <ActionForm action={setStatus} hidden={{ id: message.id, status: 'archived' }}>
                    <SubmitButton
                      className="btn-ghost btn-sm"
                      pendingLabel="…"
                      icon={<Archive className="h-4 w-4" />}
                    >
                      Archive
                    </SubmitButton>
                  </ActionForm>
                )}

                {canDelete && (
                  <ConfirmForm
                    action={async (fd) => {
                      await remove(fd);
                    }}
                    hidden={{ id: message.id }}
                    title="Delete this message?"
                    message="The message and its internal note are removed permanently."
                    confirmLabel="Delete"
                    trigger={
                      <button
                        type="button"
                        className="btn-ghost btn-sm ml-auto text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    }
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
}
