#!/usr/bin/env node
// npm run backup            take a backup now
// npm run backup -- --list  show existing backups
// npm run backup -- --prune remove old backups beyond the retention limit

import { loadEnv, ensureDirs, c, ok, fail } from './lib/paths.mjs';
import { createBackup, listBackups, pruneBackups } from './lib/backup-core.mjs';

loadEnv();
ensureDirs();

const args = process.argv.slice(2);
const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';

try {
  if (args.includes('--list')) {
    const all = listBackups();
    if (!all.length) {
      console.log('No backups yet.');
      process.exit(0);
    }
    console.log(`${c.bold}${all.length} backup(s):${c.reset}`);
    for (const b of all) {
      const m = b.manifest;
      console.log(
        `  ${b.name}  ${c.dim}schema v${m?.schema_version ?? '?'}  ` +
          `${mb((m?.db_bytes ?? 0) + (m?.uploads_bytes ?? 0))}  ` +
          `${m?.uploads_files ?? 0} file(s)${c.reset}${b.valid ? '' : '  [INVALID]'}`
      );
    }
    process.exit(0);
  }

  if (args.includes('--prune')) {
    const keep = Number(process.env.BACKUP_RETENTION || 10);
    const removed = pruneBackups(keep);
    ok(removed.length ? `Removed ${removed.length} old backup(s).` : 'Nothing to prune.');
    process.exit(0);
  }

  const labelIdx = args.indexOf('--label');
  const label = labelIdx !== -1 ? args[labelIdx + 1] : 'manual';

  const b = createBackup(null, { label });
  ok(`Backup created: ${b.name}`);
  console.log(
    `      database ${mb(b.manifest.db_bytes)}  |  uploads ${b.manifest.uploads_files} file(s), ` +
      `${mb(b.manifest.uploads_bytes)}  |  schema v${b.manifest.schema_version}`
  );

  const removed = pruneBackups(Number(process.env.BACKUP_RETENTION || 10));
  if (removed.length) console.log(`      pruned ${removed.length} old backup(s)`);
  process.exit(0);
} catch (err) {
  fail(err.message);
  process.exit(1);
}
