'use client';

import { useState } from 'react';
import {
  ShieldCheck, Lock, Unlock, LogOut, KeyRound, Trash2, Save, Pencil, X, Check, Eye, EyeOff,
} from 'lucide-react';
import { cn, formatDateTime, timeAgo, parseJson, initials } from '@/lib/utils';
import { ActionForm, ConfirmForm } from '@/components/admin/BulkForm';
import { SubmitButton } from '@/components/admin/interactive';
import { PermissionPicker } from '@/components/admin/PermissionPicker';
import { ROLE_PRESETS } from '@/lib/permissions';
import type { ActionResult } from '@/lib/admin-actions';
import type { UserRecord } from './page';

export function UserRow({
  user,
  isMe,
  canEdit,
  canDelete,
  viewerIsSuper,
  update,
  resetPassword,
  remove,
  unlock,
  revoke,
}: {
  user: UserRecord;
  isMe: boolean;
  canEdit: boolean;
  canDelete: boolean;
  viewerIsSuper: boolean;
  update: (fd: FormData) => Promise<ActionResult>;
  resetPassword: (fd: FormData) => Promise<ActionResult>;
  remove: (fd: FormData) => Promise<ActionResult>;
  unlock: (fd: FormData) => Promise<ActionResult>;
  revoke: (fd: FormData) => Promise<ActionResult>;
}) {
  const [editing, setEditing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const permissions = parseJson<string[]>(user.permissions, []);
  const locked =
    user.locked_until && new Date(user.locked_until.replace(' ', 'T') + 'Z').getTime() > Date.now();

  // A non-super admin must not be able to open the editor for a super admin.
  const mayEdit = canEdit && (viewerIsSuper || user.is_super === 0);

  if (editing) {
    return (
      <li className="bg-slate-50/70 p-5">
        <ActionForm action={update} hidden={{ id: user.id }} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Full name</label>
              <input name="full_name" defaultValue={user.full_name} className="field" />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" defaultValue={user.email ?? ''} className="field" />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={user.is_active === 1}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
            />
            Account is active and can sign in
          </label>

          <PermissionPicker
            selected={permissions}
            role={user.role}
            isSuper={user.is_super === 1}
          />

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
    <li className={cn('p-4', user.is_active === 0 && 'opacity-60')}>
      <div className="flex flex-wrap items-start gap-4">
        <span
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold',
            user.is_super ? 'bg-brand-600 text-white' : 'bg-slate-100 text-ink-soft'
          )}
        >
          {initials(user.full_name || user.username)}
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink">{user.full_name || user.username}</span>
            {isMe && <span className="chip bg-brand-50 text-brand-700 ring-brand-600/20">You</span>}
            {user.is_super === 1 && (
              <span className="chip bg-brand-600 text-white ring-brand-700/30">
                <ShieldCheck className="h-3 w-3" strokeWidth={2.5} />
                Super admin
              </span>
            )}
            {user.is_super === 0 && (
              <span className="chip bg-slate-100 text-ink-soft ring-slate-200 capitalize">
                {ROLE_PRESETS[user.role]?.label ?? user.role.replace('_', ' ')}
              </span>
            )}
            {user.is_active === 0 && (
              <span className="chip bg-slate-200 text-ink-soft ring-slate-300">Disabled</span>
            )}
            {locked && (
              <span className="chip bg-rose-50 text-rose-700 ring-rose-600/20">
                <Lock className="h-3 w-3" strokeWidth={2.5} />
                Locked
              </span>
            )}
          </p>

          <p className="mt-0.5 text-sm text-ink-muted">
            {user.username}
            {user.email ? ` · ${user.email}` : ''}
          </p>

          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-muted">
            <span>
              {user.last_login_at ? `Last signed in ${timeAgo(user.last_login_at)}` : 'Never signed in'}
            </span>
            <span>·</span>
            <span>
              {user.is_super
                ? 'Every permission'
                : `${permissions.length} permission${permissions.length === 1 ? '' : 's'}`}
            </span>
            {user.sessions > 0 && (
              <>
                <span>·</span>
                <span>{user.sessions} active session(s)</span>
              </>
            )}
            {user.failed_logins > 0 && (
              <>
                <span>·</span>
                <span className="text-rose-600">{user.failed_logins} failed attempt(s)</span>
              </>
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {locked && canEdit && (
            <ActionForm action={unlock} hidden={{ id: user.id }}>
              <SubmitButton className="btn-outline btn-sm" pendingLabel="…" icon={<Unlock className="h-4 w-4" />}>
                Unlock
              </SubmitButton>
            </ActionForm>
          )}

          {mayEdit && (
            <>
              <button
                type="button"
                onClick={() => setResetting((v) => !v)}
                title="Change the password"
                className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-slate-100 hover:text-ink"
              >
                <KeyRound className="h-4 w-4" />
              </button>

              {user.sessions > 0 && (
                <ActionForm action={revoke} hidden={{ id: user.id }}>
                  <SubmitButton
                    pendingLabel=""
                    title="Sign this account out everywhere"
                    className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-slate-100 hover:text-ink"
                  >
                    <LogOut className="h-4 w-4" />
                  </SubmitButton>
                </ActionForm>
              )}

              <button
                type="button"
                onClick={() => setEditing(true)}
                title="Edit permissions"
                className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-slate-100 hover:text-ink"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </>
          )}

          {canDelete && !isMe && (viewerIsSuper || user.is_super === 0) && (
            <ConfirmForm
              action={async (fd) => {
                await remove(fd);
              }}
              hidden={{ id: user.id }}
              title={`Delete the account "${user.username}"?`}
              message="The account is removed permanently and signed out everywhere. Anything they created - posts, notes - is kept."
              confirmLabel="Delete the account"
              confirmWord="DELETE"
              trigger={
                <button
                  type="button"
                  title="Delete the account"
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              }
            />
          )}
        </div>
      </div>

      {resetting && mayEdit && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <ActionForm action={resetPassword} hidden={{ id: user.id }} className="space-y-3">
            <label className="label">New password for {user.username}</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="field pr-11"
                autoComplete="new-password"
                placeholder="At least 8 characters, with a letter and a number"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-ink-muted hover:bg-slate-100"
                aria-label={showPassword ? 'Hide' : 'Show'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-ink-muted">
              They will be signed out of every device and will need the new password.
            </p>
            <div className="flex gap-2">
              <SubmitButton className="btn-primary btn-sm" icon={<Check className="h-4 w-4" />} pendingLabel="Changing…">
                Change the password
              </SubmitButton>
              <button type="button" onClick={() => setResetting(false)} className="btn-ghost btn-sm">
                Cancel
              </button>
            </div>
          </ActionForm>
        </div>
      )}
    </li>
  );
}
