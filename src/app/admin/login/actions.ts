'use server';

import { redirect } from 'next/navigation';
import { attemptLogin } from '@/lib/auth';

export interface LoginState {
  error?: string;
}

/**
 * Sign in. Deliberately returns the same wording for an unknown user ID and a
 * wrong password, so the form cannot be used to find out which accounts exist.
 */
export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/admin');

  if (!username || !password) {
    return { error: 'Enter both the user ID and the password.' };
  }

  const result = await attemptLogin(username, password);
  if (!result.ok) return { error: result.error };

  // Only ever redirect inside this site.
  const safeNext = next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin';
  redirect(safeNext);
}
