'use server';

import { revalidatePath } from 'next/cache';
import { guard, audit, type ActionResult } from '@/lib/admin-actions';
import { applySettingsGroup } from '@/lib/settings-write';
import { isThemeGroup } from '@/lib/theme-groups';

/** Saves one group of settings. */
export async function saveSettings(formData: FormData): Promise<ActionResult> {
  const g = await guard('settings.edit');
  if (!g.ok) return g;

  const group = String(formData.get('__group') ?? '').slice(0, 40);
  if (!group) return { ok: false, error: 'Nothing to save.' };

  // How the website looks is owned by the Themes screen and its own
  // permission, so those groups are not writable from here.
  if (isThemeGroup(group)) {
    return { ok: false, error: 'That is changed on the Themes screen.' };
  }

  const result = applySettingsGroup(group, formData);
  if (!result.ok) return result;

  await audit(g.user, 'settings.update', 'settings', group, `${result.count} value(s)`);

  // Settings feed almost every page, so refresh the whole site.
  revalidatePath('/', 'layout');

  return { ok: true, message: 'Settings saved. The website has been updated.' };
}

/** Checks whether the saved Instagram token actually works. */
export async function testSocialFeed(): Promise<ActionResult> {
  const g = await guard('settings.edit');
  if (!g.ok) return g;

  const { testSocialFeed: check } = await import('@/lib/social');
  const result = await check();

  await audit(g.user, 'settings.test_feed', 'settings', 'social', result.message);

  return result.ok ? { ok: true, message: result.message } : { ok: false, error: result.message };
}

/** Sends a test email using the SMTP details currently saved. */
export async function testEmailSettings(): Promise<ActionResult> {
  const g = await guard('settings.edit');
  if (!g.ok) return g;

  const { sendTestEmail } = await import('@/lib/mailer');
  const result = await sendTestEmail();

  await audit(g.user, 'settings.test_email', 'settings', 'email', result.ok ? 'sent' : result.error ?? 'failed');

  return result.ok
    ? { ok: true, message: 'Test email sent. Check the inbox you set as the notification address.' }
    : { ok: false, error: result.error ?? 'The test email could not be sent.' };
}
