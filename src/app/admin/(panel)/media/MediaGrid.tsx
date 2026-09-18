'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, Trash2, Copy, Check, ExternalLink, X } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { ActionForm } from '@/components/admin/BulkForm';
import { SubmitButton } from '@/components/admin/interactive';
import type { ActionResult } from '@/lib/admin-actions';
import type { MediaItem } from './page';

export function MediaGrid({
  items,
  canDelete,
  remove,
  folders,
  currentFolder,
  allHref,
}: {
  items: MediaItem[];
  canDelete: boolean;
  remove: (fd: FormData) => Promise<ActionResult>;
  /* Links are built on the server; a function cannot cross this boundary. */
  folders: { folder: string; n: number; href: string }[];
  currentFolder: string;
  allHref: string;
}) {
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [copied, setCopied] = useState(false);

  const copyLink = async (path: string) => {
    try {
      await navigator.clipboard.writeText(window.location.origin + path);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const isImage = (mime: string) => mime.startsWith('image/');

  return (
    <>
      {/* Folder filter */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-slate-100 px-5 py-3">
        <Link
          href={allHref}
          className={cn(
            'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition',
            currentFolder === 'all' ? 'bg-brand-600 text-white' : 'text-ink-muted hover:bg-slate-100'
          )}
        >
          All files
        </Link>
        {folders.map((f) => (
          <Link
            key={f.folder}
            href={f.href}
            className={cn(
              'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition',
              currentFolder === f.folder ? 'bg-brand-600 text-white' : 'text-ink-muted hover:bg-slate-100'
            )}
          >
            {f.folder}
            <span className="ml-1 opacity-60">{f.n}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelected(item)}
            className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:border-brand-400 hover:shadow-card"
          >
            {isImage(item.mime) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.path}
                alt={item.original_name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-ink-muted">
                <FileText className="h-7 w-7" strokeWidth={1.5} />
                <span className="px-2 text-[0.625rem] font-medium">
                  {item.filename.split('.').pop()?.toUpperCase()}
                </span>
              </span>
            )}

            <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink/80 to-transparent px-2 pb-1.5 pt-5 text-left text-[0.625rem] font-medium text-white opacity-0 transition group-hover:opacity-100">
              {item.original_name || item.filename}
            </span>
          </button>
        ))}
      </div>

      {/* Detail drawer */}
      {selected && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-ink/50 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />
          <div className="fixed inset-0 z-[71] grid place-items-center p-4" onClick={() => setSelected(null)}>
            <div
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-lift"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                <h2 className="truncate font-display text-base font-semibold">
                  {selected.original_name || selected.filename}
                </h2>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-slate-100"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5">
                {selected.mime.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.path}
                    alt=""
                    className="mx-auto max-h-72 rounded-xl border border-slate-200 object-contain"
                  />
                ) : (
                  <div className="grid h-40 place-items-center rounded-xl bg-slate-50 text-ink-muted">
                    <FileText className="h-10 w-10" strokeWidth={1.4} />
                  </div>
                )}

                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-ink-muted">Size</dt>
                    <dd className="text-ink">{(selected.size / 1024).toFixed(0)} KB</dd>
                  </div>
                  {selected.width && (
                    <div>
                      <dt className="text-xs text-ink-muted">Dimensions</dt>
                      <dd className="text-ink">{selected.width} × {selected.height}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-ink-muted">Folder</dt>
                    <dd className="capitalize text-ink">{selected.folder}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">Uploaded</dt>
                    <dd className="text-ink">{formatDate(selected.created_at)}</dd>
                  </div>
                  {selected.uploader && (
                    <div className="col-span-2">
                      <dt className="text-xs text-ink-muted">Uploaded by</dt>
                      <dd className="text-ink">{selected.uploader}</dd>
                    </div>
                  )}
                </dl>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copyLink(selected.path)}
                    className="btn-outline btn-sm"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy the link'}
                  </button>
                  <a
                    href={selected.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline btn-sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </a>

                  {canDelete && (
                    <ActionForm action={remove} hidden={{ id: selected.id }} className="ml-auto flex items-center gap-2">
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-muted">
                        <input
                          type="checkbox"
                          name="force"
                          value="1"
                          className="h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-600"
                        />
                        delete anyway
                      </label>
                      <SubmitButton
                        className="btn btn-sm bg-rose-600 text-white hover:bg-rose-700"
                        pendingLabel="Deleting…"
                        icon={<Trash2 className="h-4 w-4" />}
                      >
                        Delete
                      </SubmitButton>
                    </ActionForm>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
