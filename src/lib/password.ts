import 'server-only';
import crypto from 'node:crypto';

/**
 * Password hashing - scrypt with a per-password random salt.
 *
 * Stored format:  scrypt$N$r$p$<saltHex>$<hashHex>
 *
 * The cost parameters live in the string itself, so they can be raised later
 * without invalidating passwords that were hashed with the old settings.
 *
 * This must stay byte-compatible with scripts/lib/password.mjs, which is what
 * `npm run create-admin` and `npm run seed` use.
 */

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 256 * 1024 * 1024;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password.normalize('NFKC'), salt, KEYLEN, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });
  return ['scrypt', N, R, P, salt.toString('hex'), hash.toString('hex')].join('$');
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = String(stored).split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const [, n, r, p, saltHex, hashHex] = parts;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(password.normalize('NFKC'), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: MAXMEM,
    });
    // Constant-time comparison - a plain === would leak timing information.
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** Human-readable problems with a password. Empty array means it is fine. */
export function passwordProblems(password: string): string[] {
  const out: string[] = [];
  if (password.length < 8) out.push('must be at least 8 characters long');
  if (!/[A-Za-z]/.test(password)) out.push('must contain a letter');
  if (!/[0-9]/.test(password)) out.push('must contain a number');
  if (password.length > 200) out.push('is too long');
  const weak = ['password', '12345678', 'admin123', 'qwerty123', 'iloveyou', 'password1'];
  if (weak.includes(password.toLowerCase())) out.push('is too easy to guess');
  return out;
}
