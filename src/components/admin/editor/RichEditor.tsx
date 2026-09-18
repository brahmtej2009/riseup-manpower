'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Heading1, Heading2,
  Heading3, Heading4, List, ListOrdered, Quote, Minus, Link2, Link2Off, ImagePlus,
  Images, Table as TableIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo2, Redo2, Maximize2, Minimize2, Type, Palette, Highlighter, Trash2, Plus,
  ChevronDown, Loader2, RemoveFormatting, Rows3, Columns3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FontSize, TextStyle, Gallery, galleryContent, FONT_SIZES, TEXT_COLORS, HIGHLIGHT_COLORS } from './extensions';

/**
 * The post editor.
 *
 * Supports everything the client asked for: bold/italic/underline, headings,
 * font sizes, colours, highlights, lists, quotes, tables, links, alignment,
 * image upload by button, by drag-and-drop, and by Ctrl+V paste, plus gallery
 * blocks and a full-screen writing mode.
 *
 * Images are uploaded to the server as soon as they are dropped or pasted, so
 * the saved HTML holds a real URL rather than a huge base64 string.
 */

export function RichEditor({
  value,
  onChange,
  placeholder = 'Write the post here. You can paste a photograph straight in with Ctrl+V.',
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  /** Uploads one file and returns its public URL. */
  const upload = useCallback(async (file: File): Promise<string | null> => {
    setUploading((n) => n + 1);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'posts');
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || 'That image could not be uploaded.');
        return null;
      }
      return body.url as string;
    } catch {
      setError('The image could not be uploaded. Check your connection and try again.');
      return null;
    } finally {
      setUploading((n) => n - 1);
    }
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: { HTMLAttributes: { class: 'ru-code' } },
      }),
      Underline,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ['http', 'https', 'mailto', 'tel'],
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Gallery,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: { class: 'tiptap' },

      // Ctrl+V with an image on the clipboard.
      handlePaste(view, event) {
        const items = Array.from(event.clipboardData?.items ?? []);
        const images = items.filter((i) => i.type.startsWith('image/'));
        if (images.length === 0) return false;

        event.preventDefault();
        for (const item of images) {
          const file = item.getAsFile();
          if (!file) continue;
          void upload(file).then((url) => {
            if (url && editorRef.current) {
              editorRef.current.chain().focus().setImage({ src: url }).run();
            }
          });
        }
        return true;
      },

      // Dragging a file from the desktop onto the editor.
      handleDrop(view, event) {
        const files = Array.from((event as DragEvent).dataTransfer?.files ?? []);
        const images = files.filter((f) => f.type.startsWith('image/'));
        if (images.length === 0) return false;

        event.preventDefault();
        void Promise.all(images.map(upload)).then((urls) => {
          const valid = urls.filter((u): u is string => !!u);
          if (!valid.length || !editorRef.current) return;
          if (valid.length === 1) {
            editorRef.current.chain().focus().setImage({ src: valid[0] }).run();
          } else {
            editorRef.current.chain().focus().insertContent(galleryContent(valid)).run();
          }
        });
        return true;
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  // handlePaste/handleDrop are created before `editor` exists, so they read it
  // through a ref rather than closing over it.
  const editorRef = useRef<Editor | null>(null);
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Keep the editor in step when the form resets or loads a draft.
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(value, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreen) setFullscreen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  if (!editor) {
    return (
      <div className="grid h-96 place-items-center rounded-xl border border-slate-200 bg-slate-50">
        <Loader2 className="h-5 w-5 animate-spin text-ink-muted" />
      </div>
    );
  }

  const pickImages = async (files: FileList | null, asGallery: boolean) => {
    if (!files?.length) return;
    const urls = (await Promise.all(Array.from(files).map(upload))).filter(
      (u): u is string => !!u
    );
    if (!urls.length) return;

    if (asGallery && urls.length > 1) {
      editor.chain().focus().insertContent(galleryContent(urls)).run();
    } else {
      urls.forEach((url) => editor.chain().focus().setImage({ src: url }).run());
    }
  };

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link address', previous ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-slate-200 bg-white',
        fullscreen && 'editor-fullscreen'
      )}
    >
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50/95 px-2 py-1.5 backdrop-blur">
        <Group>
          <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
            <Undo2 className="h-4 w-4" />
          </Btn>
          <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
            <Redo2 className="h-4 w-4" />
          </Btn>
        </Group>

        <Divider />

        <Group>
          <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)">
            <Bold className="h-4 w-4" />
          </Btn>
          <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)">
            <Italic className="h-4 w-4" />
          </Btn>
          <Btn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)">
            <UnderlineIcon className="h-4 w-4" />
          </Btn>
          <Btn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
            <Strikethrough className="h-4 w-4" />
          </Btn>
          <Btn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code">
            <Code className="h-4 w-4" />
          </Btn>
        </Group>

        <Divider />

        <Group>
          {([1, 2, 3, 4] as const).map((level) => {
            const Icon = { 1: Heading1, 2: Heading2, 3: Heading3, 4: Heading4 }[level];
            return (
              <Btn
                key={level}
                active={editor.isActive('heading', { level })}
                onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
                title={`Heading ${level}`}
              >
                <Icon className="h-4 w-4" />
              </Btn>
            );
          })}
        </Group>

        <Divider />

        {/* Font size */}
        <Dropdown icon={<Type className="h-4 w-4" />} title="Text size" label="Size">
          {FONT_SIZES.map((size) => (
            <button
              key={size.label}
              type="button"
              onClick={() =>
                size.value
                  ? editor.chain().focus().setFontSize(size.value).run()
                  : editor.chain().focus().unsetFontSize().run()
              }
              className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-slate-50"
            >
              <span style={{ fontSize: size.value || '16px' }}>{size.label}</span>
              {size.value && <span className="text-[0.625rem] text-ink-muted">{size.value}</span>}
            </button>
          ))}
        </Dropdown>

        {/* Colour */}
        <Dropdown icon={<Palette className="h-4 w-4" />} title="Text colour" label="Colour">
          <div className="grid grid-cols-4 gap-1.5 p-2">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.label}
                type="button"
                title={c.label}
                onClick={() =>
                  c.value
                    ? editor.chain().focus().setColor(c.value).run()
                    : editor.chain().focus().unsetColor().run()
                }
                className="h-7 w-7 rounded-lg border border-slate-200 transition hover:scale-110"
                style={{ background: c.value || 'repeating-linear-gradient(45deg,#fff,#fff 4px,#e2e8f0 4px,#e2e8f0 8px)' }}
              />
            ))}
          </div>
        </Dropdown>

        <Dropdown icon={<Highlighter className="h-4 w-4" />} title="Highlight" label="Highlight">
          <div className="grid grid-cols-3 gap-1.5 p-2">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.label}
                type="button"
                title={c.label}
                onClick={() => editor.chain().focus().toggleHighlight({ color: c.value }).run()}
                className="h-7 w-7 rounded-lg border border-slate-200 transition hover:scale-110"
                style={{ background: c.value }}
              />
            ))}
            <button
              type="button"
              onClick={() => editor.chain().focus().unsetHighlight().run()}
              className="col-span-3 rounded-lg px-2 py-1 text-xs text-ink-soft hover:bg-slate-50"
            >
              Remove highlight
            </button>
          </div>
        </Dropdown>

        <Divider />

        <Group>
          <Btn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
            <List className="h-4 w-4" />
          </Btn>
          <Btn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
            <ListOrdered className="h-4 w-4" />
          </Btn>
          <Btn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
            <Quote className="h-4 w-4" />
          </Btn>
          <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider line">
            <Minus className="h-4 w-4" />
          </Btn>
        </Group>

        <Divider />

        <Group>
          {([
            ['left', AlignLeft],
            ['center', AlignCenter],
            ['right', AlignRight],
            ['justify', AlignJustify],
          ] as const).map(([align, Icon]) => (
            <Btn
              key={align}
              active={editor.isActive({ textAlign: align })}
              onClick={() => editor.chain().focus().setTextAlign(align).run()}
              title={`Align ${align}`}
            >
              <Icon className="h-4 w-4" />
            </Btn>
          ))}
        </Group>

        <Divider />

        <Group>
          <Btn active={editor.isActive('link')} onClick={setLink} title="Add a link">
            <Link2 className="h-4 w-4" />
          </Btn>
          {editor.isActive('link') && (
            <Btn onClick={() => editor.chain().focus().unsetLink().run()} title="Remove the link">
              <Link2Off className="h-4 w-4" />
            </Btn>
          )}
          <Btn onClick={() => fileInput.current?.click()} title="Insert an image">
            <ImagePlus className="h-4 w-4" />
          </Btn>
          <Btn onClick={() => galleryInput.current?.click()} title="Insert a photo gallery">
            <Images className="h-4 w-4" />
          </Btn>
        </Group>

        <Divider />

        <Dropdown icon={<TableIcon className="h-4 w-4" />} title="Table" label="Table">
          <MenuItem onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} icon={Plus}>
            Insert a 3 × 3 table
          </MenuItem>
          <MenuItem onClick={() => editor.chain().focus().addRowAfter().run()} icon={Rows3}>
            Add a row
          </MenuItem>
          <MenuItem onClick={() => editor.chain().focus().addColumnAfter().run()} icon={Columns3}>
            Add a column
          </MenuItem>
          <MenuItem onClick={() => editor.chain().focus().deleteRow().run()} icon={Minus}>
            Delete the row
          </MenuItem>
          <MenuItem onClick={() => editor.chain().focus().deleteColumn().run()} icon={Minus}>
            Delete the column
          </MenuItem>
          <MenuItem onClick={() => editor.chain().focus().deleteTable().run()} icon={Trash2} danger>
            Delete the table
          </MenuItem>
        </Dropdown>

        <Divider />

        <Group>
          <Btn
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            title="Clear all formatting"
          >
            <RemoveFormatting className="h-4 w-4" />
          </Btn>
        </Group>

        <div className="ml-auto flex items-center gap-2">
          {uploading > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-brand-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Uploading {uploading} image{uploading === 1 ? '' : 's'}…
            </span>
          )}
          <Btn onClick={() => setFullscreen((v) => !v)} title={fullscreen ? 'Leave full screen' : 'Full screen'}>
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Btn>
        </div>
      </div>

      {error && (
        <p className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>
      )}

      <EditorContent editor={editor} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-[0.6875rem] text-ink-muted">
        <span>
          {editor.storage.characterCount?.words?.() ?? editor.getText().split(/\s+/).filter(Boolean).length} words
        </span>
        <span>Paste an image with Ctrl+V, or drag one in from your computer.</span>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          void pickImages(e.target.files, false);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          void pickImages(e.target.files, true);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// --- toolbar pieces --------------------------------------------------------

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-slate-200" />;
}

function Btn({
  children,
  onClick,
  active,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-lg transition',
        active ? 'bg-brand-600 text-white' : 'text-ink-soft hover:bg-slate-200/70 hover:text-ink',
        disabled && 'opacity-30 hover:bg-transparent'
      )}
    >
      {children}
    </button>
  );
}

function Dropdown({
  icon,
  title,
  label,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        title={title}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          'flex h-8 items-center gap-1 rounded-lg px-2 text-ink-soft transition hover:bg-slate-200/70 hover:text-ink',
          open && 'bg-slate-200/70 text-ink'
        )}
      >
        {icon}
        <span className="hidden text-xs font-medium xl:inline">{label}</span>
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-30 mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lift"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  icon: Icon,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon: React.ElementType;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition',
        danger ? 'text-rose-600 hover:bg-rose-50' : 'text-ink-soft hover:bg-slate-50'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}
