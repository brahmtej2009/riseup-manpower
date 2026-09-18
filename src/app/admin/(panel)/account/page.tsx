import { KeyRound, Save, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { parseJson, formatDateTime, timeAgo } from '@/lib/utils';
import { PERMISSION_LABELS, ROLE_PRESETS } from '@/lib/permissions';
import { PageTitle, Panel, DetailList } from '@/components/admin/ui';
import { ActionForm } from '@/components/admin/BulkForm';
import { SubmitButton, InfoNote } from '@/components/admin/interactive';
import { changeOwnPassword, updateOwnProfile } from '../users/actions';

export const metadata = { title: 'My account' };

export default async function AccountPage() {
  const user = await requireUser();
  const permissions = parseJson<string[]>(user.permissions, []);

  const sessions = db.all<{ ip: string; user_agent: string; created_at: string; expires_at: string }>(
    `SELECT ip, user_agent, created_at, expires_at FROM sessions
      WHERE user_id = ? AND expires_at > datetime('now') ORDER BY created_at DESC`,
    [user.id]
  );

  return (
    <>
      <PageTitle title="My account" subtitle="Your details, your password and what you can do." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Your details">
          <ActionForm action={updateOwnProfile} className="space-y-4">
            <div>
              <label className="label" htmlFor="a-name">Full name</label>
              <input id="a-name" name="full_name" defaultValue={user.full_name} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="a-email">Email</label>
              <input
                id="a-email"
                name="email"
                type="email"
                defaultValue={user.email ?? ''}
                className="field"
              />
            </div>
            <p className="text-sm text-ink-muted">
              Your user ID is <strong className="text-ink">{user.username}</strong>. It cannot be
              changed - ask a super admin if you need a different one.
            </p>
            <SubmitButton className="btn-primary" icon={<Save className="h-4 w-4" />}>
              Save my details
            </SubmitButton>
          </ActionForm>
        </Panel>

        <Panel title="Change your password">
          <ActionForm action={changeOwnPassword} className="space-y-4">
            <div>
              <label className="label" htmlFor="p-current">Current password</label>
              <input
                id="p-current"
                name="current_password"
                type="password"
                required
                autoComplete="current-password"
                className="field"
              />
            </div>
            <div>
              <label className="label" htmlFor="p-new">New password</label>
              <input
                id="p-new"
                name="new_password"
                type="password"
                required
                autoComplete="new-password"
                className="field"
              />
              <p className="help">At least 8 characters, with a letter and a number.</p>
            </div>
            <div>
              <label className="label" htmlFor="p-confirm">Confirm the new password</label>
              <input
                id="p-confirm"
                name="confirm_password"
                type="password"
                required
                autoComplete="new-password"
                className="field"
              />
            </div>
            <SubmitButton className="btn-primary" icon={<KeyRound className="h-4 w-4" />} pendingLabel="Changing…">
              Change my password
            </SubmitButton>
          </ActionForm>
        </Panel>

        <Panel title="What you can do">
          {user.is_super ? (
            <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50/70 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
              <div>
                <p className="text-sm font-semibold text-ink">You are a super admin</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">
                  You have every permission in the system, including anything added in a future
                  update.
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm text-ink-soft">
                Your role is{' '}
                <strong className="text-ink">
                  {ROLE_PRESETS[user.role]?.label ?? user.role.replace('_', ' ')}
                </strong>
                , with {permissions.length} permission{permissions.length === 1 ? '' : 's'}.
              </p>
              <ul className="max-h-64 space-y-1 overflow-y-auto text-sm text-ink-soft">
                {permissions.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-600" />
                    {PERMISSION_LABELS[p] ?? p}
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <InfoNote>
                  Need something you cannot reach? Ask a super admin to tick it for you under Users
                  &amp; permissions.
                </InfoNote>
              </div>
            </>
          )}
        </Panel>

        <Panel title="Where you are signed in">
          <DetailList
            columns={1}
            items={[
              ['Last signed in', user.last_login_at ? formatDateTime(user.last_login_at) : 'This is your first time'],
              ['Account created', formatDateTime(user.created_at)],
              ['Active sessions', `${sessions.length}`],
            ]}
          />
          {sessions.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-ink-muted">
              {sessions.slice(0, 5).map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <span className="truncate">{s.ip}</span>
                  <span className="shrink-0">{timeAgo(s.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
