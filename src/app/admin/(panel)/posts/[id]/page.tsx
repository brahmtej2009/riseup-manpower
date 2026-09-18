import { notFound } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { parseJson } from '@/lib/utils';
import { PostForm } from '@/components/admin/editor/PostForm';
import { ConfirmForm } from '@/components/admin/BulkForm';
import { savePost, deletePost } from '../actions';

export const metadata = { title: 'Edit post' };

interface Row {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  body_html: string;
  cover_path: string | null;
  category: string;
  tags: string;
  status: 'draft' | 'published';
  pinned: number;
  urgent: number;
  published_at: string | null;
}

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission('posts.view');
  const { id } = await params;

  const row = db.get<Row>('SELECT * FROM posts WHERE id = ?', [Number(id)]);
  if (!row) notFound();

  return (
    <>
      <PostForm
        canPublish={can(user, 'posts.publish')}
        save={savePost}
        initial={{
          id: row.id,
          slug: row.slug,
          title: row.title,
          excerpt: row.excerpt,
          body_html: row.body_html,
          cover_path: row.cover_path ?? '',
          category: row.category,
          tags: parseJson<string[]>(row.tags, []).join(', '),
          status: row.status,
          pinned: row.pinned === 1,
          urgent: row.urgent === 1,
          // datetime-local needs "YYYY-MM-DDTHH:MM".
          published_at: row.published_at ? row.published_at.replace(' ', 'T').slice(0, 16) : '',
        }}
      />

      {can(user, 'posts.delete') && (
        <div className="mt-6 border-t border-slate-200 pt-6">
          <ConfirmForm
            action={deletePost}
            hidden={{ id: row.id }}
            title="Delete this post?"
            message="It is removed from the website and from the database permanently. This cannot be undone."
            confirmLabel="Delete permanently"
            confirmWord="DELETE"
            trigger={
              <button type="button" className="btn-ghost btn-sm text-rose-600 hover:bg-rose-50">
                <Trash2 className="h-4 w-4" />
                Delete this post
              </button>
            }
          />
        </div>
      )}
    </>
  );
}
