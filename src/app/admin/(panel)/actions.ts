'use server';

import { redirect } from 'next/navigation';
import { destroySession, getCurrentUser, writeAudit } from '@/lib/auth';

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) {
    await writeAudit(user.id, user.username, 'logout', 'user', String(user.id), '');
  }
  await destroySession();
  redirect('/admin/login');
}
