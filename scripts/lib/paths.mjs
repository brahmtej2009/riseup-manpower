// Shared path resolution for every CLI script.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function fromEnvOrDefault(envKey, fallback) {
  const v = process.env[envKey];
  if (!v) return path.join(ROOT, fallback);
  return path.isAbsolute(v) ? v : path.join(ROOT, v);
}

export const DATA_DIR = path.join(ROOT, 'data');
export const DB_PATH = fromEnvOrDefault('DATABASE_PATH', 'data/riseup.db');
export const UPLOAD_DIR = fromEnvOrDefault('UPLOAD_DIR', 'data/uploads');
export const BACKUP_DIR = fromEnvOrDefault('BACKUP_DIR', 'data/backups');
export const MIGRATIONS_DIR = path.join(ROOT, 'migrations');
export const LOG_DIR = path.join(ROOT, 'data', 'logs');

export function ensureDirs() {
  for (const d of [DATA_DIR, UPLOAD_DIR, BACKUP_DIR, LOG_DIR, path.dirname(DB_PATH)]) {
    fs.mkdirSync(d, { recursive: true });
  }
}

// Minimal .env loader - avoids a dependency and matches Next's own precedence
// (a real environment variable always wins over the file).
export function loadEnv() {
  for (const file of ['.env', '.env.local']) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    for (const rawLine of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

export const c = {
  reset: '[0m',
  dim: '[2m',
  bold: '[1m',
  red: '[31m',
  green: '[32m',
  yellow: '[33m',
  blue: '[34m',
  cyan: '[36m',
};

export function log(msg) {
  console.log(msg);
}
export function step(n, total, msg) {
  console.log(`${c.cyan}[${n}/${total}]${c.reset} ${msg}`);
}
export function ok(msg) {
  console.log(`${c.green}  OK${c.reset}  ${msg}`);
}
export function warn(msg) {
  console.log(`${c.yellow}  !!${c.reset}  ${msg}`);
}
export function fail(msg) {
  console.log(`${c.red}  XX${c.reset}  ${msg}`);
}
