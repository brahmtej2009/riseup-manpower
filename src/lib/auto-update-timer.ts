import { db } from './db';
import { autoUpdateTick } from './updates';

/**
 * The automatic updater's timer, started once when the server starts.
 *
 * The server checks the repository by itself, so no webhook or outside
 * service is needed. The check is cheap (a git fetch) and does nothing at all
 * unless automatic updates have been switched on in the admin panel.
 *
 * Only in production: on a development copy the working folder is being
 * edited, and an update would be the last thing anyone wants there.
 */
export function startAutoUpdater() {
  if (process.env.NODE_ENV !== 'production') return;

  const g = globalThis as { __riseupAutoUpdate?: NodeJS.Timeout };
  if (g.__riseupAutoUpdate) return;

  const minutes = Math.max(5, Number(process.env.AUTO_UPDATE_MINUTES) || 15);

  const tick = () => {
    try {
      const on = db.scalar<string>("SELECT value FROM settings WHERE key = 'sys_auto_update'") === '1';
      autoUpdateTick(on);
    } catch (e) {
      console.error('[auto-update]', (e as Error).message);
    }
  };

  // The first check waits a minute, so a restart that an update just caused
  // is fully up before anything else is looked at.
  setTimeout(tick, 60_000).unref();
  g.__riseupAutoUpdate = setInterval(tick, minutes * 60_000);
  g.__riseupAutoUpdate.unref();
}
