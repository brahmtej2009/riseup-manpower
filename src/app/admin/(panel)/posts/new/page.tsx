import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { PostForm } from '@/components/admin/editor/PostForm';
import { savePost } from '../actions';

export const metadata = { title: 'New post' };

export default async function NewPostPage() {
  const user = await requirePermission('posts.create');

  return (
    <PostForm
      canPublish={can(user, 'posts.publish')}
      save={savePost}
      initial={{
        title: '',
        excerpt: '',
        body_html: '',
        cover_path: '',
        category: 'General',
        tags: '',
        status: 'draft',
        pinned: false,
        urgent: false,
        published_at: '',
      }}
    />
  );
}
