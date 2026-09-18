import Link from 'next/link';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { can, ROLE_PRESETS } from '@/lib/permissions';
import { formatDateTime, timeAgo, parseJson, initials, cn } from '@/lib/utils';
import { PageTitle, Panel, EmptyState } from '@/components/admin/ui';
import { InfoNote } from '@/components/admin/interactive';
import { UserRow } from './UserRow';
import {
  updateUser, resetUserPassword, deleteUser, unlockUser, revokeSessions,
} from './actions';

export const metadata = { title: 'Users & permissions' };

export interface UserRecord {
  id: number;
  username: string;
  email: string | null;
  full_name: string;
  role: string;
  is_super: number;
  is_active: number;
  permissions: string;
  failed_logins: number;
  locked_until: string | null;
  last_login_at: string | null;
  created_at: string;
  sessions: number;
}

export default async function UsersPage() {
  const me = await requirePermission('users.view');

  const users = db.all<UserRecord>(
    `SELECT u.id, u.username, u.email, u.full_name, u.role, u.is_super, u.is_active,
            u.permissions, u.failed_logins, u.locked_until, u.last_login_at, u.created_at,
            (SELECT COUNT(*) FROM sessions s
              WHERE s.user_id = u.id AND s.expires_at > datetime('now')) AS sessions
       FROM users u ORDER BY u.is_super DESC, u.is_active DESC, u.username`
  );

  const activeSupers = users.filter((u) => u.is_super === 1 && u.is_active === 1).length;

  return (
    <>
      <PageTitle
        title="Users & permissions"
        subtitle={`${users.length} account${users.length === 1 ? '' : 's'}. Each one can be given exactly the access it needs.`}
        actions={
          can(me, 'users.create') && (
            <Link href="/admin/users/new" className="btn-primary btn-sm">
              <UserPlus className="h-4 w-4" />
              Create staff account
            </Link>
          )
        }
      />

      <div className="mb-5">
        <InfoNote>
          Every screen and every action in this panel has its own tick-box. Untick something and
          that person cannot reach it - not from the menu, and not by typing the address directly.
          {activeSupers === 1 && ' There is currently only one super admin; consider creating a second one so the account can never be locked out.'}
        </InfoNote>
      </div>

      <Panel title="Accounts" bodyClassName="">
        {users.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No accounts"
            description="Create the first staff account to give someone access."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isMe={user.id === me.id}
                canEdit={can(me, 'users.edit')}
                canDelete={can(me, 'users.delete')}
                viewerIsSuper={me.is_super === 1}
                update={updateUser}
                resetPassword={resetUserPassword}
                remove={deleteUser}
                unlock={unlockUser}
                revoke={revokeSessions}
              />
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
