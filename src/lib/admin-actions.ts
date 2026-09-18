import 'server-only';
import { getCurrentUser, writeAudit, type AdminUser } from './auth';
import { can, type Permission } from './permissions';

/**
 * Result type shared by every admin server action, so the UI always knows
 * whether something worked and what to tell the user.
 */
export type ActionResult<T = undefined> =
  | ({ ok: true; message?: string } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string; fields?: Record<string, string> };

export const fail = (error: string, fields?: Record<string, string>): ActionResult<never> => ({
  ok: false,
  error,
  fields,
});

export const done = (message?: string): ActionResult => ({ ok: true, message });

/**
 * Every admin action starts here.
 *
 * Returns the user if they are signed in AND hold the permission, otherwise a
 * failure. This is the real access check - the sidebar hiding a link is only
 * cosmetic, and a determined person can always call the action directly.
 */
export async function guard(
  permission: Permission
): Promise<{ ok: true; user: AdminUser } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: 'Your session has ended. Please sign in again.' };
  }
  if (!can(user, permission)) {
    return {
      ok: false,
      error: 'You do not have permission to do that. Ask an administrator if you need it.',
    };
  }
  return { ok: true, user };
}

/** Shorthand for recording what an administrator did. */
export async function audit(
  user: AdminUser,
  action: string,
  entity: string,
  entityId: string | number,
  detail = ''
): Promise<void> {
  await writeAudit(
    user.id,
    user.full_name || user.username,
    action,
    entity,
    String(entityId),
    detail
  );
}

/** Reads a checkbox-style form value. */
export const formBool = (fd: FormData, key: string): boolean => {
  const v = fd.get(key);
  return v === 'on' || v === 'true' || v === '1';
};

export const formStr = (fd: FormData, key: string, max = 2000): string =>
  String(fd.get(key) ?? '').trim().slice(0, max);

export const formInt = (fd: FormData, key: string, fallback = 0): number => {
  const n = Number(fd.get(key));
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};
