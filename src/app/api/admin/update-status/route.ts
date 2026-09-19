import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { apiUser } from '@/lib/auth';

/**
 * Progress of a running update, for the admin panel to poll.
 *
 * The update restarts the site when it finishes, so the request that started
 * it is always cut off. The panel therefore reads progress from here instead,
 * and keeps polling through the restart: the moment this answers again, the
 * new version is up.
 */
export const dynamic = 'force-dynamic';

const LOG_DIR = path.join(process.cwd(), 'data', 'logs');

function readJson(file: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(LOG_DIR, file), 'utf8'));
  } catch {
    return null;
  }
}

export async function GET() {
  const user = await apiUser('system.update');
  if (!user) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  }

  const progress = readJson('update-progress.json');
  const last = readJson('last-update.json');

  // A progress file whose process is gone means the update died without
  // writing a final state, which would otherwise leave the panel spinning.
  let running = Boolean(progress?.running);
  if (running && typeof progress?.pid === 'number') {
    try {
      process.kill(progress.pid as number, 0);
    } catch {
      running = false;
    }
  }

  return NextResponse.json(
    {
      running,
      step: progress?.step ?? 0,
      totalSteps: progress?.total_steps ?? 9,
      stage: progress?.stage ?? null,
      status: progress?.status ?? null,
      restarting: progress?.restarting ?? false,
      error: progress?.error ?? null,
      startedAt: progress?.started_at ?? null,
      updatedAt: progress?.updated_at ?? null,
      log: Array.isArray(progress?.log) ? progress.log : [],
      last,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
