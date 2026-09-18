// A thin wrapper over Node's built-in SQLite (node:sqlite).
//
// Why not better-sqlite3: it is a native addon that has to be compiled with
// Visual Studio / build tools on the server. node:sqlite ships inside Node
// itself, so `npm install` never has to compile anything and deployment on a
// bare VPS is one step simpler.
//
// The surface here matches the part of the better-sqlite3 API this project
// uses (`prepare`, `exec`, `pragma`, `transaction`, `close`), so swapping the
// driver later would only mean changing this file.

import { DatabaseSync } from 'node:sqlite';

class Db {
  constructor(filename, options = {}) {
    this.filename = filename;
    this.raw = new DatabaseSync(filename, {
      readOnly: !!options.readonly,
      enableForeignKeyConstraints: options.foreignKeys !== false,
    });
    if (!options.readonly) {
      // WAL keeps reads working while a write is in progress, which matters
      // because backups run against the live file.
      this.raw.exec('PRAGMA journal_mode = WAL');
      this.raw.exec('PRAGMA synchronous = NORMAL');
      this.raw.exec('PRAGMA busy_timeout = 5000');
    }
  }

  exec(sql) {
    this.raw.exec(sql);
    return this;
  }

  prepare(sql) {
    return this.raw.prepare(sql);
  }

  /**
   * `pragma('foo')` returns the first value; `pragma('foo = bar')` just runs it.
   * `{ simple: true }` returns a scalar rather than a row, matching
   * better-sqlite3's option of the same name.
   */
  pragma(statement, { simple = false } = {}) {
    if (/=/.test(statement) || /\(/.test(statement)) {
      // A setter, or something like wal_checkpoint(TRUNCATE).
      try {
        const row = this.raw.prepare(`PRAGMA ${statement}`).get();
        if (!simple) return row;
        return row ? Object.values(row)[0] : undefined;
      } catch {
        this.raw.exec(`PRAGMA ${statement}`);
        return undefined;
      }
    }
    const rows = this.raw.prepare(`PRAGMA ${statement}`).all();
    if (simple) return rows.length ? Object.values(rows[0])[0] : undefined;
    return rows;
  }

  /**
   * Wraps fn in a transaction. Returns a callable, like better-sqlite3.
   * Nested calls reuse the outer transaction rather than failing.
   */
  transaction(fn) {
    const self = this;
    return function (...args) {
      if (self._inTransaction) return fn.apply(this, args);
      self.raw.exec('BEGIN');
      self._inTransaction = true;
      try {
        const result = fn.apply(this, args);
        self.raw.exec('COMMIT');
        return result;
      } catch (err) {
        try {
          self.raw.exec('ROLLBACK');
        } catch {
          /* already rolled back */
        }
        throw err;
      } finally {
        self._inTransaction = false;
      }
    };
  }

  close() {
    try {
      this.raw.close();
    } catch {
      /* already closed */
    }
  }
}

export default function open(filename, options) {
  return new Db(filename, options);
}
export { Db };
