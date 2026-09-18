#!/usr/bin/env node
// npm run create-admin
//
// Creates (or resets the password of) a super-admin account.
// Prompts interactively; the password is never echoed and never logged.
//
// Non-interactive:
//   npm run create-admin -- --username admin --password "..." --name "..."

import readline from 'node:readline';
import readlinePromises from 'node:readline/promises';
import Database from './lib/sqlite.mjs';
import { loadEnv, ensureDirs, DB_PATH, c, ok, fail, warn } from './lib/paths.mjs';
import { hashPassword, passwordProblems } from './lib/password.mjs';
import { schemaVersion } from './lib/migrator.mjs';

loadEnv();
ensureDirs();

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

/** Reads a line without echoing it to the terminal. */
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const onData = (char) => {
      if (['\n', '\r', ''].includes(char.toString('utf8'))) {
        process.stdin.removeListener('data', onData);
      } else {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(question);
      }
    };
    process.stdin.on('data', onData);
    rl.question(question, (value) => {
      rl.close();
      process.stdout.write('\n');
      resolve(value);
    });
  });
}

const db = Database(DB_PATH);
db.pragma('foreign_keys = ON');

try {
  if (schemaVersion(db) === 0) {
    fail('The database has not been set up yet. Run "npm run migrate" first.');
    process.exit(1);
  }

  let username = arg('username');
  let password = arg('password');
  let fullName = arg('name');
  let email = arg('email');

  const interactive = !username || !password;

  if (interactive) {
    console.log(`${c.bold}Create an administrator account${c.reset}\n`);
    const rl = readlinePromises.createInterface({ input: process.stdin, output: process.stdout });
    username = username || (await rl.question('User ID          : ')).trim();
    fullName = fullName || (await rl.question('Full name        : ')).trim();
    email = email || (await rl.question('Email (optional) : ')).trim();
    rl.close();

    for (let i = 0; i < 3; i++) {
      password = await askHidden('Password         : ');
      const problems = passwordProblems(password);
      if (problems.length) {
        warn(`Password ${problems.join(', ')}.`);
        continue;
      }
      const again = await askHidden('Confirm password : ');
      if (again !== password) {
        warn('The passwords do not match.');
        password = '';
        continue;
      }
      break;
    }
    if (!password) {
      fail('Could not set a password.');
      process.exit(1);
    }
  }

  if (!username) {
    fail('A user ID is required.');
    process.exit(1);
  }
  const problems = passwordProblems(password || '');
  if (problems.length) {
    fail(`Password ${problems.join(', ')}.`);
    process.exit(1);
  }

  const existing = db.prepare('SELECT id, is_super FROM users WHERE username = ?').get(username);
  const hash = hashPassword(password);

  if (existing) {
    db.prepare(
      `UPDATE users SET password_hash = ?, is_super = 1, is_active = 1,
         failed_logins = 0, locked_until = NULL, updated_at = datetime('now')
       WHERE id = ?`
    ).run(hash, existing.id);
    db.prepare(
      `INSERT INTO audit_log (user_id, user_name, action, entity, entity_id, detail)
       VALUES (?, ?, 'password.reset', 'user', ?, 'Reset from the command line')`
    ).run(existing.id, username, String(existing.id));
    ok(`Password reset for "${username}". The account is a super admin and is active.`);
  } else {
    const info = db
      .prepare(
        `INSERT INTO users (username, email, full_name, password_hash, role, is_super, permissions)
         VALUES (?, ?, ?, ?, 'super_admin', 1, '[]')`
      )
      .run(username, email || null, fullName || username, hash);
    db.prepare(
      `INSERT INTO audit_log (user_id, user_name, action, entity, entity_id, detail)
       VALUES (?, ?, 'user.create', 'user', ?, 'Created from the command line')`
    ).run(info.lastInsertRowid, username, String(info.lastInsertRowid));
    ok(`Super admin "${username}" created.`);
  }

  console.log(`\n  Sign in at  /admin/login`);
  db.close();
  process.exit(0);
} catch (err) {
  fail(err.message);
  try {
    db.close();
  } catch {}
  process.exit(1);
}
