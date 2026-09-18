/**
 * The permission registry.
 *
 * Every capability in the admin panel has a key here, and the Users screen
 * renders this list as tick-boxes automatically. Adding a new feature means
 * adding its key to this file - the settings UI needs no change.
 */

export type Permission = string;

export interface PermissionGroup {
  key: string;
  label: string;
  description: string;
  permissions: { key: Permission; label: string; note?: string }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'The landing screen of the admin panel.',
    permissions: [{ key: 'dashboard.view', label: 'See the dashboard and its figures' }],
  },
  {
    key: 'submissions',
    label: 'New submissions',
    description: 'Forms filled in on the website, before they are approved.',
    permissions: [
      { key: 'submissions.view', label: 'See submissions' },
      { key: 'submissions.approve', label: 'Approve a submission into a contact' },
      { key: 'submissions.reject', label: 'Reject a submission' },
      { key: 'submissions.delete', label: 'Delete a submission permanently' },
      { key: 'submissions.export', label: 'Export submissions to CSV' },
    ],
  },
  {
    key: 'contacts',
    label: 'Contacts',
    description: 'Approved employers and candidates.',
    permissions: [
      { key: 'contacts.view', label: 'See contacts' },
      { key: 'contacts.create', label: 'Add a contact by hand' },
      { key: 'contacts.edit', label: 'Edit contact details and status' },
      { key: 'contacts.delete', label: 'Delete a contact permanently' },
      { key: 'contacts.export', label: 'Export contacts to CSV' },
    ],
  },
  {
    key: 'notes',
    label: 'Private notes',
    description: 'Internal notes kept against a contact. Never shown publicly.',
    permissions: [
      { key: 'notes.view', label: 'Read notes' },
      { key: 'notes.create', label: 'Add notes' },
      { key: 'notes.delete_own', label: 'Delete their own notes' },
      { key: 'notes.delete_any', label: 'Delete anyone’s notes', note: 'Senior staff only' },
    ],
  },
  {
    key: 'posts',
    label: 'Posts',
    description: 'Notices published on the website.',
    permissions: [
      { key: 'posts.view', label: 'See posts' },
      { key: 'posts.create', label: 'Write a new post' },
      { key: 'posts.edit', label: 'Edit any post' },
      { key: 'posts.publish', label: 'Publish or unpublish', note: 'Makes it live on the website' },
      { key: 'posts.delete', label: 'Delete a post' },
    ],
  },
  {
    key: 'team',
    label: 'Our team',
    description: 'The team members shown on the website.',
    permissions: [
      { key: 'team.view', label: 'See the team list' },
      { key: 'team.edit', label: 'Add, edit and reorder team members' },
      { key: 'team.delete', label: 'Remove a team member' },
    ],
  },
  {
    key: 'services',
    label: 'Services',
    description: 'The services listed on the website.',
    permissions: [
      { key: 'services.view', label: 'See services' },
      { key: 'services.edit', label: 'Add, edit and reorder services' },
      { key: 'services.delete', label: 'Remove a service' },
    ],
  },
  {
    key: 'gallery',
    label: 'Photo gallery',
    description: 'The photographs shown in the gallery on the website.',
    permissions: [
      { key: 'gallery.view', label: 'See the gallery' },
      { key: 'gallery.edit', label: 'Add, caption and reorder photographs' },
      { key: 'gallery.delete', label: 'Remove a photograph' },
    ],
  },
  {
    key: 'theme',
    label: 'Themes & appearance',
    description:
      'How the website looks: light and dark mode, colours, the logo, the wording on the home page and the client logo row.',
    permissions: [
      { key: 'theme.view', label: 'See the Themes screen' },
      { key: 'theme.edit', label: 'Change how the website looks', note: 'Changes are live immediately' },
    ],
  },
  {
    key: 'media',
    label: 'Media library',
    description: 'Uploaded images and files.',
    permissions: [
      { key: 'media.view', label: 'Browse the media library' },
      { key: 'media.upload', label: 'Upload files' },
      { key: 'media.delete', label: 'Delete files' },
    ],
  },
  {
    key: 'messages',
    label: 'Messages',
    description: 'Enquiries sent through the Contact page.',
    permissions: [
      { key: 'messages.view', label: 'Read messages' },
      { key: 'messages.manage', label: 'Mark read, flag and archive' },
      { key: 'messages.delete', label: 'Delete messages' },
    ],
  },
  {
    key: 'users',
    label: 'Users',
    description: 'Staff accounts and what each of them can do.',
    permissions: [
      { key: 'users.view', label: 'See the list of staff accounts' },
      { key: 'users.create', label: 'Create a staff account' },
      { key: 'users.edit', label: 'Edit accounts, permissions and passwords', note: 'Powerful' },
      { key: 'users.delete', label: 'Delete a staff account' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Everything shown on the public website.',
    permissions: [
      { key: 'settings.view', label: 'See settings' },
      { key: 'settings.edit', label: 'Change settings, logo and branding' },
    ],
  },
  {
    key: 'system',
    label: 'System',
    description: 'Backups, updates and the activity log.',
    permissions: [
      { key: 'system.logs', label: 'See the activity log' },
      { key: 'system.backup', label: 'Take and download backups' },
      { key: 'system.update', label: 'Check for and apply updates', note: 'Restarts the website' },
    ],
  },
];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.key)
);

export const PERMISSION_LABELS: Record<string, string> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => [p.key, `${g.label}: ${p.label}`]))
);

/** Ready-made sets so a new account can be set up in one click. */
export const ROLE_PRESETS: Record<
  string,
  { label: string; description: string; permissions: Permission[] }
> = {
  super_admin: {
    label: 'Super admin',
    description: 'Everything, including users, settings and updates. Cannot be locked out.',
    permissions: ALL_PERMISSIONS,
  },
  manager: {
    label: 'Manager',
    description: 'Runs the day to day work, but cannot manage staff accounts or run updates.',
    permissions: [
      'dashboard.view',
      'submissions.view','submissions.approve','submissions.reject','submissions.export',
      'contacts.view','contacts.create','contacts.edit','contacts.export',
      'notes.view','notes.create','notes.delete_own',
      'posts.view','posts.create','posts.edit','posts.publish',
      'team.view','team.edit',
      'services.view','services.edit',
      'gallery.view','gallery.edit','gallery.delete',
      'theme.view','theme.edit',
      'media.view','media.upload',
      'messages.view','messages.manage',
      'settings.view',
      'system.logs',
    ],
  },
  staff: {
    label: 'Staff',
    description: 'Handles submissions and contacts. Cannot publish or delete.',
    permissions: [
      'dashboard.view',
      'submissions.view',
      'contacts.view','contacts.edit',
      'notes.view','notes.create','notes.delete_own',
      'posts.view',
      'gallery.view',
      'theme.view',
      'media.view','media.upload',
      'messages.view','messages.manage',
    ],
  },
  viewer: {
    label: 'Viewer',
    description: 'Can look at everything relevant, but change nothing.',
    permissions: [
      'dashboard.view',
      'submissions.view',
      'contacts.view',
      'notes.view',
      'posts.view',
      'team.view',
      'services.view',
      'gallery.view',
      'theme.view',
      'media.view',
      'messages.view',
    ],
  },
};

export interface PermissionHolder {
  is_super: number | boolean;
  permissions: string[] | string;
}

function toList(permissions: string[] | string): string[] {
  if (Array.isArray(permissions)) return permissions;
  try {
    const parsed = JSON.parse(permissions || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** A super admin always passes. Everyone else needs the exact key. */
export function can(user: PermissionHolder | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  if (user.is_super) return true;
  return toList(user.permissions).includes(permission);
}

/** True if the user has at least one of the given permissions. */
export function canAny(user: PermissionHolder | null | undefined, permissions: Permission[]): boolean {
  if (!user) return false;
  if (user.is_super) return true;
  const list = toList(user.permissions);
  return permissions.some((p) => list.includes(p));
}

/** Discards anything that is not a real permission key. */
export function sanitisePermissions(input: unknown): Permission[] {
  if (!Array.isArray(input)) return [];
  const valid = new Set(ALL_PERMISSIONS);
  return [...new Set(input.filter((p): p is string => typeof p === 'string' && valid.has(p)))];
}
