import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getSiteInfo } from '@/lib/settings';
import { can } from '@/lib/permissions';
import { AdminShell } from '@/components/admin/AdminShell';
import type { NavItem } from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Admin' },
  robots: { index: false, follow: false, nocache: true },
};

// The admin panel always reflects the database as it is right now.
export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const site = getSiteInfo();

  // Badge counts, so staff can see what is waiting without opening each screen.
  const pendingSubmissions =
    db.scalar<number>(
      "SELECT COUNT(*) AS n FROM submissions WHERE status IN ('new','reviewing')"
    ) ?? 0;
  const unreadMessages =
    db.scalar<number>("SELECT COUNT(*) AS n FROM messages WHERE status = 'unread'") ?? 0;

  const nav: NavItem[] = [
    { href: '/admin', label: 'Dashboard', icon: 'LayoutDashboard', permission: 'dashboard.view', exact: true },
    { href: '/admin/submissions', label: 'New submissions', icon: 'Inbox', permission: 'submissions.view', badge: pendingSubmissions },
    { section: 'Contacts' },
    { href: '/admin/contacts/employers', label: 'Employer contacts', icon: 'Building2', permission: 'contacts.view' },
    { href: '/admin/contacts/candidates', label: 'Candidate contacts', icon: 'Users', permission: 'contacts.view' },
    { section: 'Website' },
    { href: '/admin/posts', label: 'Posts', icon: 'Megaphone', permission: 'posts.view' },
    { href: '/admin/team', label: 'Our team', icon: 'UserSquare2', permission: 'team.view' },
    { href: '/admin/services', label: 'Services', icon: 'Briefcase', permission: 'services.view' },
    { href: '/admin/gallery', label: 'Photo gallery', icon: 'Images', permission: 'gallery.view' },
    { href: '/admin/themes', label: 'Themes & appearance', icon: 'Palette', permission: 'theme.view' },
    { href: '/admin/media', label: 'Media library', icon: 'Image', permission: 'media.view' },
    { section: 'Enquiries' },
    { href: '/admin/messages', label: 'Messages', icon: 'Mail', permission: 'messages.view', badge: unreadMessages },
    { href: '/admin/analytics', label: 'Visitor statistics', icon: 'BarChart3', permission: 'dashboard.view' },
    { section: 'Administration' },
    { href: '/admin/users', label: 'Users & permissions', icon: 'ShieldCheck', permission: 'users.view' },
    { href: '/admin/settings', label: 'Settings', icon: 'Settings', permission: 'settings.view' },
    { href: '/admin/system', label: 'Backups & updates', icon: 'Server', permission: 'system.logs' },
  ];

  // Hide anything this account cannot open, and drop a section heading that
  // would end up with nothing under it.
  const visible = nav.filter((item) => !item.permission || can(user, item.permission));
  const pruned = visible.filter((item, i) => {
    if (!item.section) return true;
    const nextItem = visible[i + 1];
    return !!nextItem && !nextItem.section;
  });

  return (
    <AdminShell
      nav={pruned}
      user={{
        id: user.id,
        name: user.full_name || user.username,
        username: user.username,
        role: user.role,
        isSuper: !!user.is_super,
      }}
      site={{ name: site.name, logo: site.logo }}
    >
      {children}
    </AdminShell>
  );
}
