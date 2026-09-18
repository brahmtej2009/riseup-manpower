import 'server-only';
import { db } from './db';
import { sanitizeHtml } from './sanitize';

/**
 * Writing settings.
 *
 * Both the Settings screen and the Themes screen save the same rows, so the
 * cleaning rules live here and neither screen can drift from the other.
 *
 * Only keys that already exist in the settings table are ever written, which
 * means a posted form can never invent new configuration.
 */

export type WriteOutcome =
  | { ok: true; count: number }
  | { ok: false; error: string; fields?: Record<string, string> };

/** Cleans one value according to the type recorded against its key. */
function cleanValue(
  type: string,
  raw: string
): { value: string } | { error: string } {
  let value = raw.trim();

  switch (type) {
    case 'number':
      if (value !== '' && !/^-?\d+(\.\d+)?$/.test(value)) return { error: 'Enter a number' };
      return { value };

    case 'color':
      if (value && !/^#[0-9a-f]{6}$/i.test(value)) return { error: 'Use a colour like #1552F0' };
      return { value };

    case 'gallery': {
      // The picker posts a JSON array already. Validate it rather than
      // trusting whatever arrived, and keep only real upload paths.
      try {
        const parsed = JSON.parse(value || '[]');
        const clean = Array.isArray(parsed)
          ? parsed
              .map(String)
              .filter((u) => /^\/uploads\/[A-Za-z0-9._-]+$/.test(u))
              .slice(0, 12)
          : [];
        return { value: JSON.stringify(clean) };
      } catch {
        return { value: '[]' };
      }
    }

    case 'json': {
      // The form offers a plain "one per line" box; store it as JSON.
      const lines = value
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      return { value: JSON.stringify(lines) };
    }

    case 'image':
      // An empty value clears the image; anything else must be one of ours.
      if (value && !/^\/uploads\/[A-Za-z0-9._-]+$/.test(value)) {
        return { error: 'Upload the image again' };
      }
      return { value };

    case 'html':
      return { value: sanitizeHtml(value) };

    default:
      value = value.slice(0, 20000);
      return { value };
  }
}

/** Saves every key in one settings group. */
export function applySettingsGroup(group: string, formData: FormData): WriteOutcome {
  const known = db.all<{ key: string; type: string }>(
    'SELECT key, type FROM settings WHERE group_name = ?',
    [group]
  );
  if (known.length === 0) return { ok: false, error: 'That settings group does not exist.' };

  const errors: Record<string, string> = {};
  const writes: [string, string][] = [];

  for (const { key, type } of known) {
    // A tick-box that is off sends nothing, so booleans are handled separately.
    if (type === 'bool') {
      writes.push([key, formData.get(key) ? '1' : '0']);
      continue;
    }

    if (!formData.has(key)) continue;

    const cleaned = cleanValue(type, String(formData.get(key) ?? ''));
    if ('error' in cleaned) errors[key] = cleaned.error;
    else writes.push([key, cleaned.value]);
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      error: 'Some values are not valid. Please check the highlighted fields.',
      fields: errors,
    };
  }

  db.tx(() => {
    for (const [key, value] of writes) {
      db.run("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = ?", [
        value,
        key,
      ]);
    }
  });

  return { ok: true, count: writes.length };
}

/**
 * Saves a single setting by key.
 *
 * Used by the click-to-edit preview on the Themes screen, where one piece of
 * wording is changed on its own rather than a whole group at a time.
 */
export function applySetting(key: string, raw: string): WriteOutcome {
  const row = db.get<{ type: string; group_name: string }>(
    'SELECT type, group_name FROM settings WHERE key = ?',
    [key]
  );
  if (!row) return { ok: false, error: 'That is not something on the website that can be edited.' };

  const cleaned = cleanValue(row.type, raw);
  if ('error' in cleaned) {
    return { ok: false, error: cleaned.error, fields: { [key]: cleaned.error } };
  }

  db.run("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = ?", [
    cleaned.value,
    key,
  ]);

  return { ok: true, count: 1 };
}
