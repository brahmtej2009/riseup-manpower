import 'server-only';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';
import { verifyPassword } from './password';
import { can, canAny, type Permission } from './permissions';
import { decideCookieSecurity } from './cookie-security';

export const SESSION_COOKIE = 'riseup_admin';
const SESSION_DAYS = 7;
const MAX_FAILED_LOGINS = 6;
const LOCK_MINUTES = 15;

export interface AdminUser {
  id: number;
  username: string;
  email: string | null;
  full_name: string;
  permissions: string;
  role: string;
  is_super: number;
  is_active: number;
  last_login_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Cookie signing
// ---------------------------------------------------------------------------

/**
 * The signing key. In production SESSION_SECRET must be set - otherwise a
 * server restart or a second server would invalidate or, worse, accept
 * mismatched sessions. In development we persist a generated key so that
 * restarting `npm run dev` does not log you out every time.
 */
function sessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SESSION_SECRET is not set. Generate one with:\n' +
        '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n' +
        'and put it in your .env file before starting the site.'
    );
  }

  const devKeyFile = path.join(process.cwd(), 'data', '.session-secret');
  try {
    return fs.readFileSync(devKeyFile, 'utf8').trim();
  } catch {
    const key = crypto.randomBytes(48).toString('hex');
    fs.mkdirSync(path.dirname(devKeyFile), { recursive: true });
    fs.writeFileSync(devKeyFile, key, { mode: 0o600 });
    return key;
  }
}

function sign(value: string): string {
  const mac = crypto.createHmac('sha256', sessionSecret()).update(value).digest('base64url');
  return `${value}.${mac}`;
}

function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf('.');
  if (idx <= 0) return null;
  const value = signed.slice(0, idx);
  const expected = sign(value);
  const a = Buffer.from(signed);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return crypto.timingSafeEqual(a, b) ? value : null;
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

async function requestMeta() {
  const h = await headers();
  const ip =
    h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
  return { ip, ua: (h.get('user-agent') || '').slice(0, 300) };
}

/**
 * Whether the session cookie should carry the Secure flag for this request.
 * The rule itself lives in cookie-security.ts, free of any framework, so it
 * can be read and checked on its own.
 */
async function useSecureCookie(): Promise<boolean> {
  const h = await headers();
  return decideCookieSecurity({
    override: process.env.SESSION_COOKIE_SECURE,
    forwardedProto: h.get('x-forwarded-proto'),
    host: h.get('x-forwarded-host') ?? h.get('host'),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  });
}

export async function createSession(userId: number): Promise<void> {
  const id = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  const { ip, ua } = await requestMeta();

  db.run(
    `INSERT INTO sessions (id, user_id, ip, user_agent, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, userId, ip, ua, expires.toISOString().slice(0, 19).replace('T', ' ')]
  );

  // Old and expired sessions are cleared out opportunistically.
  db.run("DELETE FROM sessions WHERE expires_at < datetime('now')");

  const store = await cookies();
  store.set(SESSION_COOKIE, sign(id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: await useSecureCookie(),
    path: '/',
    expires,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (raw) {
    const id = unsign(raw);
    if (id) db.run('DELETE FROM sessions WHERE id = ?', [id]);
  }
  // Deleted with the same attributes it was written with, otherwise the
  // browser keeps the original cookie and signing out appears to do nothing.
  store.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: await useSecureCookie(),
    path: '/',
    maxAge: 0,
  });
}

/** The signed-in user, or null. Safe to call from any server component. */
export async function getCurrentUser(): Promise<AdminUser | null> {
  let raw: string | undefined;
  try {
    raw = (await cookies()).get(SESSION_COOKIE)?.value;
  } catch {
    return null;
  }
  if (!raw) return null;

  const id = unsign(raw);
  if (!id) return null;

  const row = db.get<AdminUser & { expires_at: string }>(
    `SELECT u.id, u.username, u.email, u.full_name, u.permissions, u.role,
            u.is_super, u.is_active, u.last_login_at, u.created_at, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND s.expires_at > datetime('now')`,
    [id]
  );

  if (!row) return null;
  if (!row.is_active) return null;
  return row;
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export type LoginResult =
  | { ok: true; user: AdminUser }
  | { ok: false; error: string; lockedForMinutes?: number };

export async function attemptLogin(username: string, password: string): Promise<LoginResult> {
  const uname = (username || '').trim();
  const generic = 'The user ID or password is incorrect.';

  const user = db.get<
    AdminUser & { password_hash: string; failed_logins: number; locked_until: string | null }
  >(
    `SELECT id, username, email, full_name, permissions, role, is_super, is_active,
            password_hash, failed_logins, locked_until, last_login_at, created_at
       FROM users WHERE username = ?`,
    [uname]
  );

  // Hash a dummy password when the account does not exist, so that a wrong
  // user ID takes the same amount of time as a wrong password.
  if (!user) {
    verifyPassword(password, 'scrypt$16384$8$1$00$00');
    return { ok: false, error: generic };
  }

  if (user.locked_until) {
    const until = new Date(user.locked_until.replace(' ', 'T') + 'Z').getTime();
    if (Number.isFinite(until) && until > Date.now()) {
      const mins = Math.ceil((until - Date.now()) / 60000);
      return {
        ok: false,
        error: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`,
        lockedForMinutes: mins,
      };
    }
  }

  if (!user.is_active) {
    return { ok: false, error: 'This account has been disabled. Contact an administrator.' };
  }

  if (!verifyPassword(password, user.password_hash)) {
    const failed = user.failed_logins + 1;
    if (failed >= MAX_FAILED_LOGINS) {
      db.run(
        `UPDATE users SET failed_logins = ?,
            locked_until = datetime('now', '+${LOCK_MINUTES} minutes')
          WHERE id = ?`,
        [failed, user.id]
      );
      await writeAudit(user.id, user.username, 'login.locked', 'user', String(user.id),
        `Locked after ${failed} failed attempts`);
      return {
        ok: false,
        error: `Too many failed attempts. This account is locked for ${LOCK_MINUTES} minutes.`,
        lockedForMinutes: LOCK_MINUTES,
      };
    }
    db.run('UPDATE users SET failed_logins = ? WHERE id = ?', [failed, user.id]);
    await writeAudit(user.id, user.username, 'login.failed', 'user', String(user.id),
      `Attempt ${failed} of ${MAX_FAILED_LOGINS}`);
    return { ok: false, error: generic };
  }

  db.run(
    `UPDATE users SET failed_logins = 0, locked_until = NULL,
        last_login_at = datetime('now') WHERE id = ?`,
    [user.id]
  );
  await createSession(user.id);
  await writeAudit(user.id, user.username, 'login.success', 'user', String(user.id), '');

  return { ok: true, user };
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/** Use at the top of any admin page. Redirects to the login page if needed. */
export async function requireUser(returnTo?: string): Promise<AdminUser> {
  const user = await getCurrentUser();
  if (!user) {
    const target = returnTo ? `?next=${encodeURIComponent(returnTo)}` : '';
    redirect(`/admin/login${target}`);
  }
  return user;
}

/** Use at the top of a page that needs a specific permission. */
export async function requirePermission(permission: Permission): Promise<AdminUser> {
  const user = await requireUser();
  if (!can(user, permission)) redirect('/admin/no-access');
  return user;
}

export async function requireAnyPermission(permissions: Permission[]): Promise<AdminUser> {
  const user = await requireUser();
  if (!canAny(user, permissions)) redirect('/admin/no-access');
  return user;
}

/** For API routes: returns the user or null, never redirects. */
export async function apiUser(permission?: Permission): Promise<AdminUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (permission && !can(user, permission)) return null;
  return user;
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export async function writeAudit(
  userId: number | null,
  userName: string,
  action: string,
  entity = '',
  entityId = '',
  detail = ''
): Promise<void> {
  let ip = 'unknown';
  try {
    ip = (await requestMeta()).ip;
  } catch {
    /* called outside a request */
  }
  db.run(
    `INSERT INTO audit_log (user_id, user_name, action, entity, entity_id, detail, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, userName, action, entity, entityId, detail.slice(0, 1000), ip]
  );
}

export { can, canAny };
