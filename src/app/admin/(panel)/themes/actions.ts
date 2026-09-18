'use server';

import { revalidatePath } from 'next/cache';
import { guard, audit, formStr, type ActionResult } from '@/lib/admin-actions';
import { applySettingsGroup, applySetting } from '@/lib/settings-write';
import { isThemeGroup, isPreviewField, PREVIEW_FIELDS } from '@/lib/theme-groups';

/** Every change here is live on the website, so the whole site is refreshed. */
function refresh() {
  revalidatePath('/', 'layout');
  revalidatePath('/admin/themes');
}

/** Saves one group of appearance settings. */
export async function saveThemeSettings(formData: FormData): Promise<ActionResult> {
  const g = await guard('theme.edit');
  if (!g.ok) return g;

  const group = formStr(formData, '__group', 40);
  if (!isThemeGroup(group)) {
    return { ok: false, error: 'That is not part of the website appearance.' };
  }

  const result = applySettingsGroup(group, formData);
  if (!result.ok) return result;

  await audit(g.user, 'theme.update', 'settings', group, `${result.count} value(s)`);
  refresh();

  return { ok: true, message: 'Saved. The website has been updated.' };
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
