import { Image as ImageIcon, FileText } from 'lucide-react';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { formatDate } from '@/lib/utils';
import { PageTitle, Panel, EmptyState, SearchBox, Pagination } from '@/components/admin/ui';
import { MediaGrid } from './MediaGrid';
import { deleteMediaItem } from './actions';

export const metadata = { title: 'Media library' };

const PER_PAGE = 36;

export interface MediaItem {
  id: number;
  filename: string;
  original_name: string;
  path: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  folder: string;
  created_at: string;
  uploader: string | null;
}

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; folder?: string }>;
}) {
  const user = await requirePermission('media.view');
  const params = await searchParams;

  const query = (params.q ?? '').trim();
  const folder = params.folder ?? 'all';
  const page = Math.max(1, Number(params.page) || 1);

  const where: string[] = [];
  const args: unknown[] = [];

  if (folder !== 'all') {
    where.push('m.folder = ?');
    args.push(folder);
  }
  if (query) {
    where.push('(m.original_name LIKE ? OR m.filename LIKE ? OR m.alt LIKE ?)');
    const like = `%${query}%`;
    args.push(like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.scalar<number>(`SELECT COUNT(*) AS n FROM media m ${whereSql}`, args) ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const safePage = Math.min(page, pages);

  const items = db.all<MediaItem>(
    `SELECT m.id, m.filename, m.original_name, m.path, m.mime, m.size, m.width, m.height,
            m.folder, m.created_at, u.full_name AS uploader
       FROM media m LEFT JOIN users u ON u.id = m.uploaded_by
       ${whereSql}
      ORDER BY m.id DESC LIMIT ? OFFSET ?`,
    [...args, PER_PAGE, (safePage - 1) * PER_PAGE]
  );

  const folderRows = db.all<{ folder: string; n: number }>(
    'SELECT folder, COUNT(*) AS n FROM media GROUP BY folder ORDER BY n DESC'
  );

  const totalBytes = db.scalar<number>('SELECT COALESCE(SUM(size), 0) AS n FROM media') ?? 0;

  const link = (next: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    const merged: Record<string, string | number | undefined> = { q: query, folder, page: safePage, ...next };
    if (merged.q) sp.set('q', String(merged.q));
    if (merged.folder && merged.folder !== 'all') sp.set('folder', String(merged.folder));
    if (merged.page && Number(merged.page) > 1) sp.set('page', String(merged.page));
    const qs = sp.toString();
    return qs ? `/admin/media?${qs}` : '/admin/media';
  };

  return (
    <>
      <PageTitle
        title="Media library"
        subtitle={`${total} file${total === 1 ? '' : 's'} · ${(totalBytes / 1048576).toFixed(1)} MB in total`}
      />

      <Panel
        bodyClassName=""
        actions={
          <SearchBox
            action="/admin/media"
            placeholder="Search by file name…"
            defaultValue={query}
            hidden={{ folder: folder !== 'all' ? folder : undefined }}
            className="w-full sm:w-64"
          />
        }
      >
        {items.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title={query ? 'Nothing matches that search' : 'No files yet'}
            description={
              query
                ? 'Try a different file name.'
                : 'Images uploaded through the post editor, the team screen and settings collect here.'
            }
          />
        ) : (
          <MediaGrid
            items={items}
            canDelete={can(user, 'media.delete')}
            remove={deleteMediaItem}
            folders={folderRows.map((f) => ({
              ...f,
              href: link({ folder: f.folder, page: 1 }),
            }))}
            currentFolder={folder}
            allHref={link({ folder: 'all', page: 1 })}
          />
        )}

        <Pagination page={safePage} pages={pages} build={(p) => link({ page: p })} />
      </Panel>
    </>
  );
}
