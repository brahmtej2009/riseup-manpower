'use server';

import { revalidatePath } from 'next/cache';
import { guard, audit, formStr, type ActionResult } from '@/lib/admin-actions';
import { applySetting } from '@/lib/settings-write';
import { isEditableKey, isPreviewField, PREVIEW_FIELDS } from '@/lib/theme-groups';

/** Every change here is live on the website, so the whole site is refreshed. */
function refresh() {
  revalidatePath('/', 'layout');
  revalidatePath('/admin/themes');
}

/**
 * Saves the controls of one section.
 *
 * The form posts the keys it is responsible for in `__keys`, and each is
 * checked against the editor's own allow-list before anything is written. A
 * section mixes keys from several settings groups, so saving by key rather
 * than by group is both simpler and tighter: a crafted post cannot reach a
 * setting this screen does not show.
 */
export async function saveThemeFields(formData: FormData): Promise<ActionResult> {
  const g = await guard('theme.edit');
  if (!g.ok) return g;

  const keys = formStr(formData, '__keys', 2000)
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  if (keys.length === 0) return { ok: false, error: 'Nothing to save.' };

  const rejected = keys.filter((k) => !isEditableKey(k));
  if (rejected.length > 0) {
    return { ok: false, error: 'That is not something this screen can change.' };
  }

  const fields: Record<string, string> = {};
  let saved = 0;

  for (const key of keys) {
    // A tick-box that is off posts nothing at all, so it is read as "off"
    // rather than skipped - otherwise it could never be turned back off.
    const isCheckbox = formData.get(`__bool_${key}`) !== null;
    const raw = isCheckbox
      ? formData.get(key)
        ? '1'
        : '0'
      : formData.has(key)
        ? String(formData.get(key) ?? '')
        : null;

    if (raw === null) continue;

    const result = applySetting(key, raw);
    if (!result.ok) {
      Object.assign(fields, result.fields ?? { [key]: result.error });
    } else {
      saved += 1;
    }
  }

  if (Object.keys(fields).length > 0) {
    return { ok: false, error: 'Some values are not valid.', fields };
  }

  await audit(g.user, 'theme.update', 'settings', keys.join(','), `${saved} value(s)`);
  refresh();

  return { ok: true, message: 'Saved.' };
}

/**
 * Saves one piece of wording, chosen by selecting it in the preview.
 *
 * The key must be one of the fields marked as editable in the preview, so a
 * crafted request cannot reach a setting that is not meant to be changed this
 * way - an API token, for instance.
 */
export async function savePreviewField(formData: FormData): Promise<ActionResult> {
  const g = await guard('theme.edit');
  if (!g.ok) return g;

  const key = formStr(formData, 'key', 60);
  if (!isPreviewField(key)) {
    return { ok: false, error: 'That part of the page cannot be edited here.' };
  }

  const result = applySetting(key, formStr(formData, 'value', 20000));
  if (!result.ok) return result;

  await audit(g.user, 'theme.update', 'settings', key, 'edited in the preview');
  refresh();

  return { ok: true, message: `${PREVIEW_FIELDS[key].label} saved.` };
}
