import fs from 'node:fs';
import path from 'node:path';
import { Database, HardDriveDownload, RefreshCw, ScrollText, Server, ShieldCheck, Clock } from 'lucide-react';
import { db } from '@/lib/db';
import { requireAnyPermission } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getSettings, str, num } from '@/lib/settings';
import { formatDateTime, timeAgo, cn } from '@/lib/utils';
import { PageTitle, Panel, StatCard, EmptyState, DetailList } from '@/components/admin/ui';
import { InfoNote } from '@/components/admin/interactive';
import { SystemActions } from './SystemActions';
import { createBackupNow, checkForUpdates, runUpdateNow, pruneAnalyticsNow } from './actions';

export const metadata = { title: 'Backups & updates' };

interface BackupInfo {
  name: string;
  created: string;
  schema: number | string;
  sizeMb: string;
  files: number;
  label: string;
}

function readBackups(): BackupInfo[] {
  const dir = path.join(process.cwd(), 'data', 'backups');
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      let manifest: Record<string, unknown> = {};
      try {
        manifest = JSON.parse(fs.readFileSync(path.join(dir, e.name, 'manifest.json'), 'utf8'));
      } catch {
        /* a backup without a manifest is still listed */
      }
      const bytes = Number(manifest.db_bytes ?? 0) + Number(manifest.uploads_bytes ?? 0);
      return {
        name: e.name,
        created: String(manifest.created_at ?? ''),
        schema: (manifest.schema_version as number) ?? '?',
        sizeMb: (bytes / 1048576).toFixed(1),
        files: Number(manifest.uploads_files ?? 0),
        label: String(manifest.label ?? ''),
      };
    })
    .sort((a, b) => b.name.localeCompare(a.name));
}

function readLastUpdate(): Record<string, unknown> | null {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data', 'logs', 'last-update.json'), 'utf8')
    );
  } catch {
    return null;
  }
}

export default async function SystemPage() {
  const user = await requireAnyPermission(['system.logs', 'system.backup', 'system.update']);
  const settings = getSettings();

  const backups = readBackups();
  const lastUpdate = readLastUpdate();

  const schemaVersion = db.scalar<number>('SELECT MAX(version) AS v FROM _migrations') ?? 0;
  const migrations = db.all<{ version: number; name: string; applied_at: string }>(
    'SELECT version, name, applied_at FROM _migrations ORDER BY version DESC LIMIT 8'
  );

  const dbPath = path.join(process.cwd(), 'data', 'riseup.db');
  const dbSize = fs.existsSync(dbPath) ? (fs.statSync(dbPath).size / 1048576).toFixed(1) : '0';

  const counts = {
    submissions: db.scalar<number>('SELECT COUNT(*) AS n FROM submissions') ?? 0,
    contacts: db.scalar<number>('SELECT COUNT(*) AS n FROM contacts') ?? 0,
    posts: db.scalar<number>('SELECT COUNT(*) AS n FROM posts') ?? 0,
    messages: db.scalar<number>('SELECT COUNT(*) AS n FROM messages') ?? 0,
    media: db.scalar<number>('SELECT COUNT(*) AS n FROM media') ?? 0,
    pageViews: db.scalar<number>('SELECT COUNT(*) AS n FROM page_views') ?? 0,
  };

  const auditLog = can(user, 'system.logs')
    ? db.all<{
        id: number; user_name: string; action: string; entity: string; entity_id: string;
        detail: string; ip: string | null; created_at: string;
      }>('SELECT * FROM audit_log ORDER BY id DESC LIMIT 60')
    : [];

  const repo = str(settings, 'sys_repo_url');

  return (
    <>
      <PageTitle
        title="Backups & updates"
        subtitle="The health of the system, and the tools to look after it."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Database size" value={`${dbSize} MB`} icon={Database} tone="brand" />
        <StatCard label="Schema version" value={schemaVersion} icon={Server}
          hint={`${migrations.length > 0 ? 'last applied ' + timeAgo(migrations[0].applied_at) : ''}`} />
        <StatCard label="Backups kept" value={backups.length} icon={HardDriveDownload}
          tone={backups.length === 0 ? 'amber' : 'emerald'}
          hint={backups[0] ? `newest ${timeAgo(backups[0].created)}` : 'none yet'} />
        <StatCard label="Records stored" value={
          counts.submissions + counts.contacts + counts.posts + counts.messages
        } icon={ScrollText} hint={`${counts.pageViews} page views`} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <SystemActions
            canBackup={can(user, 'system.backup')}
            canUpdate={can(user, 'system.update')}
            canPrune={can(user, 'system.logs')}
            repoConfigured={!!repo}
            backup={createBackupNow}
            check={checkForUpdates}
            update={runUpdateNow}
            prune={pruneAnalyticsNow}
          />

          {/* Backups */}
          <Panel
            title="Backups"
            description={`Stored in data/backups. The oldest are removed beyond ${num(settings, 'sys_backup_retention', 10)}.`}
            bodyClassName=""
          >
            {backups.length === 0 ? (
              <EmptyState
                icon={HardDriveDownload}
                title="No backups yet"
                description="Take one now, and one is taken automatically before every update and every migration."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-ink-muted">
                      <th className="px-5 py-2.5 font-medium">Backup</th>
                      <th className="px-3 py-2.5 font-medium">Taken</th>
                      <th className="px-3 py-2.5 font-medium">Schema</th>
                      <th className="px-3 py-2.5 font-medium">Size</th>
                      <th className="px-3 py-2.5 font-medium">Files</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {backups.slice(0, 15).map((b) => (
                      <tr key={b.name}>
                        <td className="px-5 py-2.5">
                          <span className="block font-mono text-xs text-ink">{b.name}</span>
                          {b.label && (
                            <span className="text-[0.6875rem] capitalize text-ink-muted">
                              {b.label.replace('-', ' ')}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-ink-soft">
                          {b.created ? timeAgo(b.created) : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-ink-soft">v{b.schema}</td>
                        <td className="px-3 py-2.5 text-ink-soft">{b.sizeMb} MB</td>
                        <td className="px-3 py-2.5 text-ink-soft">{b.files}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t border-slate-100 p-5">
              <InfoNote>
                To restore a backup, run{' '}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                  npm run restore -- {backups[0]?.name ?? '<backup-name>'}
                </code>{' '}
                on the server. The current state is backed up first, so a restore can itself be
                undone.
              </InfoNote>
            </div>
          </Panel>

          {/* Audit log */}
          {can(user, 'system.logs') && (
            <Panel title="Activity log" description="Who did what, and when." bodyClassName="">
              {auditLog.length === 0 ? (
                <EmptyState icon={ScrollText} title="Nothing logged yet" />
              ) : (
                <ul className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">
                  {auditLog.map((entry) => (
                    <li key={entry.id} className="flex items-start gap-3 px-5 py-2.5 text-sm">
                      <span
                        className={cn(
                          'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                          entry.action.includes('delete') || entry.action.includes('failed')
                            ? 'bg-rose-500'
                            : entry.action.includes('login')
                              ? 'bg-slate-400'
                              : 'bg-emerald-500'
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-ink">
                          <span className="font-medium">{entry.user_name || 'system'}</span>{' '}
                          <span className="text-ink-soft">{entry.action.replace(/\./g, ' ')}</span>
                          {entry.entity && (
                            <span className="text-ink-muted">
                              {' '}· {entry.entity}
                              {entry.entity_id ? ` #${entry.entity_id}` : ''}
                            </span>
                          )}
                        </span>
                        {entry.detail && (
                          <span className="block truncate text-xs text-ink-muted">{entry.detail}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-ink-muted" title={formatDateTime(entry.created_at)}>
                        {timeAgo(entry.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
        </div>

        <div className="space-y-5">
          {/* Last update */}
          <Panel title="Last update">
            {!lastUpdate ? (
              <p className="text-sm text-ink-muted">No update has been run from this server yet.</p>
            ) : (
              <>
                <span
                  className={cn(
                    'chip mb-3',
                    lastUpdate.status === 'success'
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                      : 'bg-rose-50 text-rose-700 ring-rose-600/20'
                  )}
                >
                  {lastUpdate.status === 'success' ? 'Succeeded' : 'Failed and rolled back'}
                </span>
                <DetailList
                  columns={1}
                  items={[
                    ['Started', lastUpdate.started_at ? formatDateTime(String(lastUpdate.started_at)) : null],
                    ['Finished', lastUpdate.finished_at ? formatDateTime(String(lastUpdate.finished_at)) : null],
                    ['From', lastUpdate.from ? String(lastUpdate.from).slice(0, 8) : null],
                    ['To', lastUpdate.to ? String(lastUpdate.to).slice(0, 8) : null],
                    ['Schema', lastUpdate.schema_to ? `v${lastUpdate.schema_from} → v${lastUpdate.schema_to}` : null],
                    ['Backup taken', lastUpdate.backup ? String(lastUpdate.backup) : null],
                    ['Failed at', lastUpdate.failed_at_stage ? String(lastUpdate.failed_at_stage) : null],
                    [
                      'Error',
                      lastUpdate.error ? (
                        <span key="e" className="block whitespace-pre-wrap text-xs text-rose-700">
                          {String(lastUpdate.error).slice(0, 400)}
                        </span>
                      ) : null,
                    ],
                  ]}
                />
              </>
            )}
          </Panel>

          {/* Migrations */}
          <Panel title="Database migrations" description="Each one runs only once, ever.">
            <ul className="space-y-2 text-sm">
              {migrations.map((m) => (
                <li key={m.version} className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-mono text-xs text-ink">
                      {String(m.version).padStart(3, '0')}_{m.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-ink-muted">{timeAgo(m.applied_at)}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="What is stored">
            <DetailList
              columns={1}
              items={[
                ['Submissions', String(counts.submissions)],
                ['Contacts', String(counts.contacts)],
                ['Posts', String(counts.posts)],
                ['Messages', String(counts.messages)],
                ['Media files', String(counts.media)],
                ['Page views recorded', String(counts.pageViews)],
              ]}
            />
          </Panel>

          <Panel title="Safety">
            <ul className="space-y-2.5 text-sm text-ink-soft">
              {[
                'The database is backed up before every update and every migration.',
                'A failed update rolls the code and the database back automatically.',
                'Migrations only ever add; they never drop or reset data.',
                'Uploads live outside the code folder, so an update cannot touch them.',
                'Passwords are hashed with scrypt and cannot be read back.',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.2} />
                  {line}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
