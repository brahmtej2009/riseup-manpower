import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requirePermission } from '@/lib/auth';
import { PageTitle } from '@/components/admin/ui';
import { NewUserForm } from '../NewUserForm';
import { createUser } from '../actions';

export const metadata = { title: 'Create a staff account' };

/**
 * Creating an account gets a page of its own. The permission list is long by
 * design, and it needs room to be read rather than being squeezed into a
 * sidebar next to the list of existing accounts.
 */
export default async function NewUserPage() {
  const me = await requirePermission('users.create');

  return (
    <>
      <Link
        href="/admin/users"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to users
      </Link>

      <PageTitle
        title="Create a staff account"
        subtitle="Pick a role to start from, then tick or untick anything you want to change."
      />

      <div className="max-w-4xl">
        <NewUserForm create={createUser} canMakeSuper={me.is_super === 1} />
      </div>
    </>
  );
}
