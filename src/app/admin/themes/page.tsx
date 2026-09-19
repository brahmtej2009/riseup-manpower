import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getSettingRows, getSettings, str } from '@/lib/settings';
import { db } from '@/lib/db';
import { PREVIEW_FIELDS, EDITABLE_KEYS } from '@/lib/theme-groups';
import { ThemeEditor } from './ThemeEditor';
import { saveThemeFields, savePreviewField } from './actions';

export const metadata = { title: 'Website editor' };

// The editor always reflects the database as it is right now.
export const dynamic = 'force-dynamic';

export default async function ThemesPage() {
  const user = await requirePermission('theme.view');
  const editable = can(user, 'theme.edit');

  const s = getSettings();

  // Only the rows the editor actually lays out, so a setting that is no
  // longer shown anywhere on the website cannot reappear here as an empty
  // box that changes nothing.
  const rows = getSettingRows().filter((r) => EDITABLE_KEYS.includes(r.key));

  const previewValues: Record<string, string> = {};
  for (const key of Object.keys(PREVIEW_FIELDS)) previewValues[key] = str(s, key);

  const counts = {
    photos: db.scalar<number>('SELECT COUNT(*) AS n FROM gallery_photos') ?? 0,
    logos: db.scalar<number>('SELECT COUNT(*) AS n FROM client_logos') ?? 0,
  };

  return (
    <ThemeEditor
      rows={rows}
      previewValues={previewValues}
      editable={editable}
      save={saveThemeFields}
      savePreview={savePreviewField}
      counts={counts}
    />
  );
}
