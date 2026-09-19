/**
 * Runs once when the server starts. Starts the automatic updater's timer,
 * which lives in its own file because it needs Node (the database, git).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startAutoUpdater } = await import('./lib/auto-update-timer');
    startAutoUpdater();
  }
}
