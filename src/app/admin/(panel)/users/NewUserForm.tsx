'use client';

import { useState } from 'react';
import { UserPlus, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { ActionForm } from '@/components/admin/BulkForm';
import { SubmitButton } from '@/components/admin/interactive';
import { PermissionPicker } from '@/components/admin/PermissionPicker';
import { Panel } from '@/components/admin/ui';
import { ROLE_PRESETS } from '@/lib/permissions';
import type { ActionResult } from '@/lib/admin-actions';

/** Suggests a password that meets the rules and is still readable aloud. */
function suggestPassword(): string {
  const words = ['Bridge', 'Anchor', 'Harvest', 'Copper', 'Lantern', 'Summit', 'Marble', 'Falcon'];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  return `${pick()}-${pick()}${Math.floor(Math.random() * 90 + 10)}`;
}

export function NewUserForm({
  create,
  canMakeSuper,
}: {
  create: (fd: FormData) => Promise<ActionResult>;
  canMakeSuper: boolean;
}) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);

  return (
    <ActionForm action={create} className="space-y-5">
      <Panel title="Who is this account for">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="u-name">Full name</label>
            <input id="u-name" name="full_name" className="field" placeholder="Their full name" />
          </div>

          <div>
            <label className="label" htmlFor="u-username">User ID</label>
            <input
              id="u-username"
              name="username"
              required
              className="field"
              placeholder="What they type to sign in"
              autoComplete="off"
              pattern="[a-zA-Z0-9._\-]{3,32}"
            />
            <p className="help">3 to 32 characters. Letters, numbers, dot, dash or underscore.</p>
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="u-email">Email</label>
            <input id="u-email" name="email" type="email" className="field" placeholder="Optional" />
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="u-password">Password</label>
            <div className="relative">
              <input
                id="u-password"
                name="password"
                type={show ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field pr-20"
                autoComplete="new-password"
                placeholder="At least 8 characters, with a letter and a number"
              />
              <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setPassword(suggestPassword());
                    setShow(true);
                  }}
                  title="Suggest a password"
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-slate-100 hover:text-ink"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  title={show ? 'Hide' : 'Show'}
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-slate-100 hover:text-ink"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="help">
              Write it down and hand it over directly. It is hashed on save and cannot be read back
              afterwards, by anybody.
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft sm:col-span-2">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
            />
            Account is active and can sign in straight away
          </label>
        </div>
      </Panel>

      <Panel
        title="What they can do"
        description="Pick a role, then adjust anything you want. Untick something and they cannot reach it at all."
      >
        <PermissionPicker selected={ROLE_PRESETS.staff.permissions} role="staff" isSuper={false} />

        {!canMakeSuper && (
          <p className="mt-4 text-xs text-ink-muted">
            Only a super admin can create another super admin.
          </p>
        )}
      </Panel>

      <div className="flex items-center gap-3">
        <SubmitButton
          className="btn-primary"
          icon={<UserPlus className="h-4 w-4" />}
          pendingLabel="Creating…"
        >
          Create the account
        </SubmitButton>
        <a href="/admin/users" className="btn-ghost">
          Cancel
        </a>
      </div>
    </ActionForm>
  );
}
