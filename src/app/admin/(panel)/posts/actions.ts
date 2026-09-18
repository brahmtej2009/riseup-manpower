'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { guard, audit, formStr, formInt, formBool, type ActionResult } from '@/lib/admin-actions';
import { can } from '@/lib/permissions';
import { sanitizeHtml, htmlToText, extractImages } from '@/lib/sanitize';
import { uniqueSlug } from '@/lib/server-utils';
import { slugify } from '@/lib/utils';

/**
 * Saves a post.
 *
 * The body HTML comes from the rich text editor in the browser, so it is
 * filtered through the sanitiser before it is ever written to the database.
 * Publishing is a separate permission from editing.
 */
export async function savePost(formData: FormData): Promise<ActionResult<{ id: number }>> {
  const id = formInt(formData, 'id');
  const g = await guard(id ? 'posts.edit' : 'posts.create');
  if (!g.ok) return g;

  const title = formStr(formData, 'title', 200);
  if (title.length < 3) {
    return { ok: false, error: 'Give the post a title.', fields: { title: 'A title is required' } };
  }

  const wantsPublished = formStr(formData, 'status', 20) === 'published';
  if (wantsPublished && !can(g.user, 'posts.publish')) {
    return {
      ok: false,
      error: 'You can write and save posts, but not publish them. Save it as a draft and ask an administrator to publish it.',
    };
  }

  const bodyHtml = sanitizeHtml(String(formData.get('body_html') ?? ''));
  const excerptInput = formStr(formData, 'excerpt', 500);
  const excerpt = excerptInput || htmlToText(bodyHtml, 200);

  // If no cover was chosen, the first image in the body stands in for one.
  const coverInput = formStr(formData, 'cover_path', 300);
  const cover = coverInput || extractImages(bodyHtml)[0] || null;

  const category = formStr(formData, 'category', 60) || 'General';
  const tags = formStr(formData, 'tags', 300)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);

  const pinned = formBool(formData, 'pinned') ? 1 : 0;
  const urgent = formBool(formData, 'urgent') ? 1 : 0;
  const status = wantsPublished ? 'published' : 'draft';

  // A publish date may be set in the future, which holds it back until then.
  const publishAtInput = formStr(formData, 'published_at', 30);
  const publishedAt = wantsPublished
    ? publishAtInput
      ? publishAtInput.replace('T', ' ') + ':00'
      : null
    : null;

  try {
    if (id) {
      const existing = db.get<{ slug: string; title: string; status: string; published_at: string | null }>(
        'SELECT slug, title, status, published_at FROM posts WHERE id = ?',
        [id]
      );
      if (!existing) return { ok: false, error: 'That post no longer exists.' };

      // The address only changes if the title changed, so shared links survive.
      const slug =
        existing.title === title ? existing.slug : uniqueSlug(slugify(title), id);

      // Keep the original publish date when re-saving something already live.
      const finalPublishedAt =
        status === 'published'
          ? publishedAt ?? existing.published_at ?? new Date().toISOString().slice(0, 19).replace('T', ' ')
          : null;

      db.run(
        `UPDATE posts
            SET slug = ?, title = ?, excerpt = ?, body_html = ?, cover_path = ?, category = ?,
                tags = ?, status = ?, pinned = ?, urgent = ?, published_at = ?,
                updated_at = datetime('now')
          WHERE id = ?`,
        [slug, title, excerpt, bodyHtml, cover, category, JSON.stringify(tags), status,
         pinned, urgent, finalPublishedAt, id]
      );

      await audit(g.user, 'post.update', 'post', id, `${title} (${status})`);
      revalidatePath('/admin/posts');
      revalidatePath('/posts');
      revalidatePath(`/posts/${slug}`);
      revalidatePath('/');

      return { ok: true, message: status === 'published' ? 'Saved and published.' : 'Draft saved.', data: { id } };
    }

    const slug = uniqueSlug(slugify(title));
    const info = db.run(
      `INSERT INTO posts
         (slug, title, excerpt, body_html, cover_path, category, tags, status, pinned, urgent,
          published_at, author_id, author_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        slug, title, excerpt, bodyHtml, cover, category, JSON.stringify(tags), status,
        pinned, urgent,
        status === 'published'
          ? publishedAt ?? new Date().toISOString().slice(0, 19).replace('T', ' ')
          : null,
        g.user.id,
        g.user.full_name || g.user.username,
      ]
    );

    await audit(g.user, 'post.create', 'post', info.lastInsertRowid, `${title} (${status})`);
    revalidatePath('/admin/posts');
    revalidatePath('/posts');
    revalidatePath('/');

    return {
      ok: true,
      message: status === 'published' ? 'Published.' : 'Saved as a draft.',
      data: { id: info.lastInsertRowid },
    };
  } catch (err) {
    console.error('[savePost]', err);
    return { ok: false, error: 'The post could not be saved. Nothing was changed.' };
  }
}

export async function togglePublish(formData: FormData): Promise<ActionResult> {
  const g = await guard('posts.publish');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const row = db.get<{ title: string; status: string; slug: string; published_at: string | null }>(
    'SELECT title, status, slug, published_at FROM posts WHERE id = ?',
    [id]
  );
  if (!row) return { ok: false, error: 'That post no longer exists.' };

  const next = row.status === 'published' ? 'draft' : 'published';
  db.run(
    `UPDATE posts
        SET status = ?,
            published_at = CASE WHEN ? = 'published'
                                THEN COALESCE(published_at, datetime('now')) ELSE NULL END,
            updated_at = datetime('now')
      WHERE id = ?`,
    [next, next, id]
  );

  await audit(g.user, `post.${next}`, 'post', id, row.title);
  revalidatePath('/admin/posts');
  revalidatePath('/posts');
  revalidatePath(`/posts/${row.slug}`);
  revalidatePath('/');

  return {
    ok: true,
    message: next === 'published' ? 'Now live on the website.' : 'Taken off the website.',
  };
}

export async function toggleFlag(formData: FormData): Promise<ActionResult> {
  const g = await guard('posts.edit');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const flag = formStr(formData, 'flag', 10);
  if (flag !== 'pinned' && flag !== 'urgent') {
    return { ok: false, error: 'That is not a valid option.' };
  }

  const row = db.get<Record<string, number>>(`SELECT ${flag} AS value FROM posts WHERE id = ?`, [id]);
  if (!row) return { ok: false, error: 'That post no longer exists.' };

  db.run(`UPDATE posts SET ${flag} = ?, updated_at = datetime('now') WHERE id = ?`, [
    row.value ? 0 : 1,
    id,
  ]);

  revalidatePath('/admin/posts');
  revalidatePath('/posts');
  revalidatePath('/');

  const on = !row.value;
  return {
    ok: true,
    message:
      flag === 'pinned'
        ? on ? 'Pinned to the top.' : 'No longer pinned.'
        : on ? 'Marked urgent.' : 'No longer marked urgent.',
  };
}

export async function deletePost(formData: FormData): Promise<void> {
  const g = await guard('posts.delete');
  if (!g.ok) return;

  const id = formInt(formData, 'id');
  const row = db.get<{ title: string; slug: string }>(
    'SELECT title, slug FROM posts WHERE id = ?',
    [id]
  );
  if (!row) return;

  db.run('DELETE FROM posts WHERE id = ?', [id]);
  await audit(g.user, 'post.delete', 'post', id, row.title);

  revalidatePath('/admin/posts');
  revalidatePath('/posts');
  revalidatePath('/');
  redirect('/admin/posts');
}

/** Duplicates a post as a fresh draft - handy for recurring notices. */
export async function duplicatePost(formData: FormData): Promise<ActionResult> {
  const g = await guard('posts.create');
  if (!g.ok) return g;

  const id = formInt(formData, 'id');
  const row = db.get<{
    title: string; excerpt: string; body_html: string; cover_path: string | null;
    category: string; tags: string;
  }>('SELECT title, excerpt, body_html, cover_path, category, tags FROM posts WHERE id = ?', [id]);

  if (!row) return { ok: false, error: 'That post no longer exists.' };

  const title = `${row.title} (copy)`;
  db.run(
    `INSERT INTO posts
       (slug, title, excerpt, body_html, cover_path, category, tags, status, author_id, author_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
    [
      uniqueSlug(slugify(title)), title, row.excerpt, row.body_html, row.cover_path,
      row.category, row.tags, g.user.id, g.user.full_name || g.user.username,
    ]
  );

  await audit(g.user, 'post.duplicate', 'post', id, title);
  revalidatePath('/admin/posts');

  return { ok: true, message: 'Copied as a new draft.' };
}
