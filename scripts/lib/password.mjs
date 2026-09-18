// Password hashing - scrypt with a per-password random salt.
//
// Stored format:  scrypt$N$r$p$<saltHex>$<hashHex>
// The parameters are stored alongside the hash so they can be raised later
// without invalidating existing passwords.
//
// NOTE: src/lib/password.ts implements the identical format for the web app.
// If you change the format here, change it there too.

import crypto from 'node:crypto';

const N = 16384; // CPU/memory cost
const R = 8;
const P = 1;
const KEYLEN = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password.normalize('NFKC'), salt, KEYLEN, {
    N,
    r: R,
    p: P,
    maxmem: 256 * 1024 * 1024,
  });
  return ['scrypt', N, R, P, salt.toString('hex'), hash.toString('hex')].join('$');
}

export function verifyPassword(password, stored) {
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
      maxmem: 256 * 1024 * 1024,
    });
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** Returns a list of human-readable problems, empty if the password is fine. */
export function passwordProblems(password) {
  const out = [];
  if (password.length < 8) out.push('must be at least 8 characters');
  if (!/[A-Za-z]/.test(password)) out.push('must contain a letter');
  if (!/[0-9]/.test(password)) out.push('must contain a number');
  const weak = ['password', '12345678', 'admin123', 'qwerty123', 'iloveyou'];
  if (weak.includes(password.toLowerCase())) out.push('is too common');
  return out;
}
