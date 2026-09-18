'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { guard, audit, formStr, formInt, formBool, type ActionResult } from '@/lib/admin-actions';
import { hashPassword, passwordProblems } from '@/lib/password';
import { sanitisePermissions, ROLE_PRESETS } from '@/lib/permissions';

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/;

/** The number of super admins left, so the last one cannot be locked out. */
function superAdminCount(excludingId?: number): number {
  return (
    db.scalar<number>(
      `SELECT COUNT(*) AS n FROM users
        WHERE is_super = 1 AND is_active = 1 ${excludingId ? 'AND id != ?' : ''}`,
      excludingId ? [excludingId] : []
    ) ?? 0
  );
}

export async function createUser(formData: FormData): Promise<ActionResult> {
  const g = await guard('users.create');
  if (!g.ok) return g;

  const username = formStr(formData, 'username', 32).toLowerCase();
  const password = String(formData.get('password') ?? '');
  const fullName = formStr(formData, 'full_name', 120);
  const email = formStr(formData, 'email', 160);
  const role = formStr(formData, 'role', 20);

  if (!USERNAME_RE.test(username)) {
    return {
      ok: false,
      error: 'The user ID must be 3 to 32 characters, using only letters, numbers, dot, dash or underscore.',
      fields: { username: 'Invalid user ID' },
    };
  }
  if (db.get('SELECT 1 AS x FROM users WHERE username = ?', [username])) {
    return { ok: false, error: 'That user ID is already taken.', fields: { username: 'Already taken' } };
  }

  const problems = passwordProblems(password);
  if (problems.length) {
    return { ok: false, error: `The password ${problems.join(', ')}.`, fields: { password: problems[0] } };
  }

  // Only a super admin may create another super admin.
  const wantsSuper = formBool(formData, 'is_super');
  if (wantsSuper && !g.user.is_super) {
    return { ok: false, error: 'Only a super admin can create another super admin.' };
  }

  // A preset fills the tick-boxes; anything ticked by hand wins.
  const chosen = formData.getAll('permissions').map(String);
  const permissions = wantsSuper
    ? []
    : sanitisePermissions(chosen.length ? chosen : ROLE_PRESETS[role]?.permissions ?? []);

  const info = db.run(
    `INSERT INTO users (username, email, full_name, password_hash, role, is_super, permissions,
                        is_active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      username,
      email || null,
      fullName || username,
      hashPassword(password),
      wantsSuper ? 'super_admin' : role || 'staff',
      wantsSuper ? 1 : 0,
      JSON.stringify(permissions),
      formBool(formData, 'is_active') ? 1 : 0,
      g.user.id,
    ]
  );

  await audit(g.user, 'user.create', 'user', info.lastInsertRowid, `${username} (${wantsSuper ? 'super admin' : role})`);
  revalidatePath('/admin/users');

  return { ok: true, message: `Account "${username}" created.` };
}

export async function updateUser(formData: FormData): Promise<ActionResult> {
  const g = await guard('users.edit');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const target = db.get<{ username: string; is_super: number; is_active: number }>(
    'SELECT username, is_super, is_active FROM users WHERE id = ?',
    [id]
  );
  if (!target) return { ok: false, error: 'That account no longer exists.' };

  // Someone who is not a super admin must not be able to edit one, or to
  // promote themselves by ticking the box.
  if (target.is_super && !g.user.is_super) {
    return { ok: false, error: 'Only a super admin can change another super admin.' };
  }

  const wantsSuper = formBool(formData, 'is_super');
  if (wantsSuper && !g.user.is_super) {
    return { ok: false, error: 'Only a super admin can grant super admin rights.' };
  }

  const isActive = formBool(formData, 'is_active');

  // The last active super admin must stay active and stay a super admin,
  // otherwise nobody could ever administer the site again.
  if (target.is_super && (!wantsSuper || !isActive) && superAdminCount(id) === 0) {
    return {
      ok: false,
      error: 'This is the only active super admin. Create another one before changing this account.',
    };
  }

  const chosen = formData.getAll('permissions').map(String);
  const permissions = wantsSuper ? [] : sanitisePermissions(chosen);

  db.run(
    `UPDATE users
        SET full_name = ?, email = ?, role = ?, is_super = ?, permissions = ?, is_active = ?,
            updated_at = datetime('now')
      WHERE id = ?`,
    [
      formStr(formData, 'full_name', 120) || target.username,
      formStr(formData, 'email', 160) || null,
      wantsSuper ? 'super_admin' : formStr(formData, 'role', 20) || 'staff',
      wantsSuper ? 1 : 0,
      JSON.stringify(permissions),
      isActive ? 1 : 0,
      id,
    ]
  );

  // Disabling an account should also end any session it has open.
  if (!isActive) db.run('DELETE FROM sessions WHERE user_id = ?', [id]);

  await audit(g.user, 'user.update', 'user', id, target.username);
  revalidatePath('/admin/users');

  return { ok: true, message: 'Account updated.' };
}

export async function resetUserPassword(formData: FormData): Promise<ActionResult> {
  const g = await guard('users.edit');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const password = String(formData.get('password') ?? '');

  const target = db.get<{ username: string; is_super: number }>(
    'SELECT username, is_super FROM users WHERE id = ?',
    [id]
  );
  if (!target) return { ok: false, error: 'That account no longer exists.' };
  if (target.is_super && !g.user.is_super) {
    return { ok: false, error: 'Only a super admin can reset another super admin’s password.' };
  }

  const problems = passwordProblems(password);
  if (problems.length) return { ok: false, error: `The password ${problems.join(', ')}.` };

  db.run(
    `UPDATE users SET password_hash = ?, failed_logins = 0, locked_until = NULL,
        updated_at = datetime('now') WHERE id = ?`,
    [hashPassword(password), id]
  );

  // Changing a password signs that person out everywhere.
  db.run('DELETE FROM sessions WHERE user_id = ?', [id]);

  await audit(g.user, 'user.password_reset', 'user', id, target.username);
  revalidatePath('/admin/users');

  return { ok: true, message: `Password changed for "${target.username}". They have been signed out.` };
}

export async function deleteUser(formData: FormData): Promise<ActionResult> {
  const g = await guard('users.delete');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  if (id === g.user.id) {
    return { ok: false, error: 'You cannot delete your own account.' };
  }

  const target = db.get<{ username: string; is_super: number }>(
    'SELECT username, is_super FROM users WHERE id = ?',
    [id]
  );
  if (!target) return { ok: false, error: 'That account has already been removed.' };

  if (target.is_super && !g.user.is_super) {
    return { ok: false, error: 'Only a super admin can delete another super admin.' };
  }
  if (target.is_super && superAdminCount(id) === 0) {
    return { ok: false, error: 'This is the only super admin. Create another one first.' };
  }

  db.run('DELETE FROM users WHERE id = ?', [id]);
  await audit(g.user, 'user.delete', 'user', id, target.username);
  revalidatePath('/admin/users');

  return { ok: true, message: `Account "${target.username}" deleted.` };
}

/** Clears a lockout after too many wrong passwords. */
export async function unlockUser(formData: FormData): Promise<ActionResult> {
  const g = await guard('users.edit');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  db.run('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?', [id]);

  await audit(g.user, 'user.unlock', 'user', id, '');
  revalidatePath('/admin/users');

  return { ok: true, message: 'Account unlocked.' };
}

/** Signs an account out of every device. */
export async function revokeSessions(formData: FormData): Promise<ActionResult> {
  const g = await guard('users.edit');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const result = db.run('DELETE FROM sessions WHERE user_id = ?', [id]);

  await audit(g.user, 'user.revoke_sessions', 'user', id, `${result.changes} session(s)`);
  revalidatePath('/admin/users');

  return { ok: true, message: `Signed out of ${result.changes} device(s).` };
}

/** Changing your own password - available to every signed-in account. */
export async function changeOwnPassword(formData: FormData): Promise<ActionResult> {
  const g = await guard('dashboard.view');
  if (!g.ok) return g;

  const current = String(formData.get('current_password') ?? '');
  const next = String(formData.get('new_password') ?? '');
  const confirm = String(formData.get('confirm_password') ?? '');

  const row = db.get<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = ?', [
    g.user.id,
  ]);
  if (!row) return { ok: false, error: 'Your account could not be found.' };

  const { verifyPassword } = await import('@/lib/password');
  if (!verifyPassword(current, row.password_hash)) {
    return { ok: false, error: 'Your current password is not correct.' };
  }
  if (next !== confirm) {
    return { ok: false, error: 'The two new passwords do not match.' };
  }

  const problems = passwordProblems(next);
  if (problems.length) return { ok: false, error: `The new password ${problems.join(', ')}.` };

  db.run("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", [
    hashPassword(next),
    g.user.id,
  ]);

  await audit(g.user, 'user.password_change', 'user', g.user.id, 'Changed their own password');

  return { ok: true, message: 'Your password has been changed.' };
}

export async function updateOwnProfile(formData: FormData): Promise<ActionResult> {
  const g = await guard('dashboard.view');
  if (!g.ok) return g;

  db.run("UPDATE users SET full_name = ?, email = ?, updated_at = datetime('now') WHERE id = ?", [
    formStr(formData, 'full_name', 120) || g.user.username,
    formStr(formData, 'email', 160) || null,
    g.user.id,
  ]);

  revalidatePath('/admin/account');
  return { ok: true, message: 'Your details have been updated.' };
}
