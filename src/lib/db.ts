import 'server-only';
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Single database connection, shared across the whole server process.
 *
 * Uses Node's built-in SQLite so nothing has to be compiled at install time.
 * The connection is cached on globalThis because Next.js re-evaluates modules
 * on every hot reload in development, which would otherwise leak handles.
 */

const DB_PATH = (() => {
  const v = process.env.DATABASE_PATH;
  if (!v) return path.join(process.cwd(), 'data', 'riseup.db');
  return path.isAbsolute(v) ? v : path.join(process.cwd(), v);
})();

export const UPLOAD_DIR = (() => {
  const v = process.env.UPLOAD_DIR;
  if (!v) return path.join(process.cwd(), 'data', 'uploads');
  return path.isAbsolute(v) ? v : path.join(process.cwd(), v);
})();

type Row = Record<string, unknown>;

class Db {
  readonly raw: DatabaseSync;
  private inTransaction = false;
  private statements = new Map<string, StatementSync>();

  constructor() {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    this.raw = new DatabaseSync(DB_PATH, { enableForeignKeyConstraints: true });

    // busy_timeout must be the very first pragma. It makes SQLite retry for
    // up to 5s instead of failing immediately whenever another connection
    // briefly holds the lock - which matters here because `next build`
    // collects page data by loading every route module, often in several
    // worker processes at once, each opening its own connection to this same
    // file. Setting it later, after a lock-needing pragma, is too late to
    // help that first statement.
    this.execWithRetry('PRAGMA busy_timeout = 5000');

    // Switching journal mode itself needs a brief exclusive lock. Once the
    // file is already in WAL mode - true for every connection after the
    // very first one ever made against it - re-issuing this is both
    // pointless and one more chance to collide with a concurrent opener, so
    // it is only run when actually needed.
    const currentMode = this.raw.prepare('PRAGMA journal_mode').get() as
      | { journal_mode?: string }
      | undefined;
    if ((currentMode?.journal_mode ?? '').toLowerCase() !== 'wal') {
      this.execWithRetry('PRAGMA journal_mode = WAL');
    }

    this.raw.exec('PRAGMA synchronous = NORMAL');

    this.assertMigrated();
  }

  /**
   * Runs one exec, retrying briefly on SQLITE_BUSY.
   *
   * Used only for the pragma that switches journal mode, which needs a lock
   * before `busy_timeout` has necessarily taken effect everywhere else that
   * might be opening a connection to this same file at that exact moment -
   * several `next build` workers on a cold database, for instance. A normal
   * query never needs this: busy_timeout already covers it once the
   * connection is past this point.
   */
  private execWithRetry(sql: string, attempts = 8): void {
    for (let i = 1; i <= attempts; i++) {
      try {
        this.raw.exec(sql);
        return;
      } catch (err) {
        const busy = (err as { code?: string }).code === 'ERR_SQLITE_ERROR';
        if (!busy || i === attempts) throw err;
        const until = Date.now() + i * 40;
        while (Date.now() < until) {
          /* a short, deliberately blocking wait - this runs during startup,
             before the connection is handling any request */
        }
      }
    }
  }

  /**
   * The app never changes the schema itself - `npm run migrate` does, and it
   * runs as part of `npm run build` and `npm run dev`. Failing loudly here is
   * much safer than serving pages against a half-built database.
   */
  private assertMigrated() {
    const t = this.raw
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'")
      .get();
    if (!t) {
      throw new Error(
        'The database has not been set up.\n' +
          'Run:  npm run migrate   (and then  npm run seed  to add demo data)'
      );
    }
  }

  /** Prepared statements are cached - the same SQL is reused, not re-parsed. */
  private stmt(sql: string): StatementSync {
    let s = this.statements.get(sql);
    if (!s) {
      s = this.raw.prepare(sql);
      this.statements.set(sql, s);
    }
    return s;
  }

  /**
   * First matching row, or undefined.
   *
   * node:sqlite returns rows with a null prototype. React refuses to send
   * those from a server component to a client component, so every row is
   * copied into a plain object on the way out.
   */
  get<T = Row>(sql: string, params: unknown[] | Row = []): T | undefined {
    const s = this.stmt(sql);
    const r = Array.isArray(params)
      ? s.get(...(params as never[]))
      : s.get(params as never);
    return r === undefined || r === null ? undefined : ({ ...(r as Row) } as T);
  }

  /** Every matching row, as plain objects. */
  all<T = Row>(sql: string, params: unknown[] | Row = []): T[] {
    const s = this.stmt(sql);
    const r = Array.isArray(params)
      ? s.all(...(params as never[]))
      : s.all(params as never);
    return (r as Row[]).map((row) => ({ ...row })) as T[];
  }

  /** INSERT / UPDATE / DELETE. */
  run(sql: string, params: unknown[] | Row = []): { changes: number; lastInsertRowid: number } {
    const s = this.stmt(sql);
    const r = Array.isArray(params)
      ? s.run(...(params as never[]))
      : s.run(params as never);
    return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
  }

  /** A single scalar, e.g. count(*). */
  scalar<T = number>(sql: string, params: unknown[] | Row = []): T | undefined {
    const row = this.get<Row>(sql, params);
    if (!row) return undefined;
    return Object.values(row)[0] as T;
  }

  exec(sql: string) {
    this.raw.exec(sql);
  }

  /** Runs fn inside a transaction, rolling back if it throws. */
  tx<T>(fn: () => T): T {
    if (this.inTransaction) return fn();
    this.raw.exec('BEGIN');
    this.inTransaction = true;
    try {
      const out = fn();
      this.raw.exec('COMMIT');
      return out;
    } catch (err) {
      try {
        this.raw.exec('ROLLBACK');
      } catch {
        /* already rolled back */
      }
      throw err;
    } finally {
      this.inTransaction = false;
    }
  }
}

const globalForDb = globalThis as unknown as { __riseupDb?: Db };

export const db: Db = globalForDb.__riseupDb ?? new Db();
if (process.env.NODE_ENV !== 'production') globalForDb.__riseupDb = db;

export { DB_PATH };
export type { Db };
