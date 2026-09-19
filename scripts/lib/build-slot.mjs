// Two build folders, so an update never rebuilds the one the site is serving.
//
// `next start` serves the newest complete build. `next build` writes into the
// other folder. The running site keeps its own files untouched until the
// restart, and a failed build leaves the working one as the newest.
import fs from 'node:fs';
import path from 'node:path';

export const SLOTS = ['.next', '.next-b'];

function builtAt(root, dir) {
  try {
    return fs.statSync(path.join(root, dir, 'BUILD_ID')).mtimeMs;
  } catch {
    return 0;
  }
}

/** The newest complete build, which is what `next start` serves. */
export function servingSlot(root = process.cwd()) {
  const [a, b] = SLOTS;
  return builtAt(root, b) > builtAt(root, a) ? b : a;
}

/** Where the next build goes: whichever slot is not being served. */
export function buildSlot(root = process.cwd()) {
  return servingSlot(root) === SLOTS[0] ? SLOTS[1] : SLOTS[0];
}

/** Takes a build out of the running, so the other one is served again. */
export function discardSlot(dir, root = process.cwd()) {
  fs.rmSync(path.join(root, dir, 'BUILD_ID'), { force: true });
}

/**
 * The build folder finished after `since` (a ms timestamp), or null.
 * Works for older versions of the site too, which always build into .next.
 */
export function builtSince(since, root = process.cwd()) {
  return SLOTS.find((dir) => builtAt(root, dir) >= since) ?? null;
}
