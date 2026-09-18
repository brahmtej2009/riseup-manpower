'use client';

import { useState } from 'react';
import { Eye, EyeOff, Trash2, ChevronUp, ChevronDown, Save, Pencil, X } from 'lucide-react';
import { cn, initials } from '@/lib/utils';
import { ActionForm, ConfirmForm } from '@/components/admin/BulkForm';
import { SubmitButton } from '@/components/admin/interactive';
import { ImagePicker } from '@/components/admin/ImagePicker';
import type { ActionResult } from '@/lib/admin-actions';

interface Member {
  id: number;
  name: string;
  designation: string;
  bio: string;
  photo_path: string | null;
  email: string;
  phone: string;
  linkedin: string;
  is_visible: number;
}

/** One row in the team list, which expands into an edit form in place. */
export function TeamMemberRow({
  member,
  index,
  total,
  editable,
  canDelete,
  save,
  remove,
  toggle,
  move,
}: {
  member: Member;
  index: number;
  total: number;
  editable: boolean;
  canDelete: boolean;
  save: (fd: FormData) => Promise<ActionResult>;
  remove: (fd: FormData) => Promise<ActionResult>;
  toggle: (fd: FormData) => Promise<ActionResult>;
  move: (fd: FormData) => Promise<ActionResult>;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="bg-slate-50/70 p-5">
        <ActionForm action={save} hidden={{ id: member.id }} className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <ImagePicker
              name="photo_path"
              value={member.photo_path ?? ''}
              label="Photograph"
              folder="team"
              square
              maxSize={800}
            />

            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Name</label>
                <input name="name" defaultValue={member.name} required className="field" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Designation</label>
                <input name="designation" defaultValue={member.designation} className="field" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Short line about them</label>
                <textarea
                  name="bio"
                  defaultValue={member.bio}
                  rows={2}
                  maxLength={600}
                  className="field text-sm"
                />
              </div>
              <input name="email" defaultValue={member.email} className="field" placeholder="Email" />
              <input name="phone" defaultValue={member.phone} className="field" placeholder="Phone" />
              <input
                name="linkedin"
                defaultValue={member.linkedin}
                className="field sm:col-span-2"
                placeholder="LinkedIn profile URL"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              name="is_visible"
              defaultChecked={member.is_visible === 1}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
            />
            Show on the website
          </label>

          <div className="flex gap-2">
            <SubmitButton className="btn-primary btn-sm" icon={<Save className="h-4 w-4" />}>
              Save changes
            </SubmitButton>
            <button type="button" onClick={() => setEditing(false)} className="btn-ghost btn-sm">
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </ActionForm>
      </li>
    );
  }

  return (
    <li className={cn('flex items-center gap-4 p-4', member.is_visible === 0 && 'opacity-55')}>
      {member.photo_path ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.photo_path}
          alt=""
          className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover"
        />
      ) : (
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-brand-600/10 font-display text-sm font-bold text-brand-700">
          {initials(member.name)}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate font-medium text-ink">
          {member.name}
          {member.is_visible === 0 && (
            <span className="chip bg-slate-100 text-ink-muted ring-slate-200">Hidden</span>
          )}
        </p>
        {member.designation && (
          <p className="truncate text-sm text-brand-700">{member.designation}</p>
        )}
        {member.bio && <p className="mt-0.5 truncate text-xs text-ink-muted">{member.bio}</p>}
      </div>

      {editable && (
        <div className="flex shrink-0 items-center gap-1">
          <ActionForm action={move} hidden={{ id: member.id, direction: 'up' }}>
            <SubmitButton
              pendingLabel=""
              title="Move up"
              disabled={index === 0}
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-slate-100 hover:text-ink disabled:opacity-25"
            >
              <ChevronUp className="h-4 w-4" />
            </SubmitButton>
          </ActionForm>

          <ActionForm action={move} hidden={{ id: member.id, direction: 'down' }}>
            <SubmitButton
              pendingLabel=""
              title="Move down"
              disabled={index === total - 1}
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-slate-100 hover:text-ink disabled:opacity-25"
            >
              <ChevronDown className="h-4 w-4" />
            </SubmitButton>
          </ActionForm>

          <ActionForm action={toggle} hidden={{ id: member.id }}>
            <SubmitButton
              pendingLabel=""
              title={member.is_visible ? 'Hide from the website' : 'Show on the website'}
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-slate-100 hover:text-ink"
            >
              {member.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </SubmitButton>
          </ActionForm>

          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Edit"
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-slate-100 hover:text-ink"
          >
            <Pencil className="h-4 w-4" />
          </button>

          {canDelete && (
            <ConfirmForm
              action={async (fd) => {
                await remove(fd);
              }}
              hidden={{ id: member.id }}
              title={`Remove ${member.name}?`}
              message="They are removed from the website and from the database. Their photograph stays in the media library."
              confirmLabel="Remove"
              trigger={
                <button
                  type="button"
                  title="Remove"
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              }
            />
          )}
        </div>
      )}
    </li>
  );
}
