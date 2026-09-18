/**
 * HTML sanitiser for post content.
 *
 * Posts are written by staff in the rich text editor, but a staff
 * account is not the same as a trusted account: someone with "write
 * posts" must not be able to plant a script that steals a super
 * admin's session when the page is viewed. So everything is filtered against
 * an allow-list on the way into the database, and again on the way out.
 *
 * Anything not explicitly allowed is dropped.
 */

const ALLOWED_TAGS = new Set([
  'p','br','hr','h1','h2','h3','h4','h5','h6',
  'strong','b','em','i','u','s','strike','del','ins','mark','sub','sup','small','span',
  'a','ul','ol','li','blockquote','pre','code','figure','figcaption','img','div',
  'table','thead','tbody','tfoot','tr','th','td','caption','col','colgroup',
]);

/** Tags whose entire contents are removed, not just the tag itself. */
const VOID_CONTENT_TAGS = new Set([
  'script','style','iframe','object','embed','noscript','template','form','input',
  'button','select','textarea','svg','math','link','meta','base','frame','frameset',
]);

const SELF_CLOSING = new Set(['br', 'hr', 'img', 'col']);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height', 'class', 'loading']),
  td: new Set(['colspan', 'rowspan', 'style', 'class']),
  th: new Set(['colspan', 'rowspan', 'style', 'class', 'scope']),
  col: new Set(['span', 'style']),
  colgroup: new Set(['span']),
  ol: new Set(['start', 'type', 'style', 'class']),
  li: new Set(['style', 'class', 'data-checked']),
  '*': new Set(['style', 'class']),
};

/** Inline styles are the only place a colour or size can come from. */
const ALLOWED_STYLE_PROPS = new Set([
  'color','background-color','text-align','font-size','font-weight','font-style',
  'text-decoration','width','height',
]);

const ALLOWED_CLASS_PREFIXES = ['ru-', 'text-', 'tiptap-'];

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/|#)/i;

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, (m) => m);
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cleanUrl(raw: string): string | null {
  // Entities and whitespace are the classic ways to smuggle "javascript:".
  const value = decodeEntities(raw).replace(/[\s\u0000-\u001F\u007F-\u009F]/g, '').trim();
  if (!value) return null;
  if (!SAFE_URL.test(value)) return null;
  if (/^javascript:/i.test(value) || /^data:/i.test(value) || /^vbscript:/i.test(value)) return null;
  return raw.trim();
}

function cleanImageSrc(raw: string): string | null {
  const value = decodeEntities(raw).trim();
  // Uploaded images are served from /uploads. data: URIs are allowed only for
  // images, because pasting a screenshot produces one before it is uploaded.
  if (/^data:image\/(png|jpe?g|gif|webp|avif);base64,[A-Za-z0-9+/=\s]+$/i.test(value)) return value;
  return cleanUrl(raw);
}

function cleanStyle(raw: string): string | null {
  const out: string[] = [];
  for (const decl of decodeEntities(raw).split(';')) {
    const idx = decl.indexOf(':');
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim();
    if (!ALLOWED_STYLE_PROPS.has(prop)) continue;
    // No url(), no expression(), no escapes.
    if (/url\s*\(|expression|javascript:|@import|\\/i.test(value)) continue;
    if (value.length > 80) continue;
    out.push(`${prop}: ${value}`);
  }
  return out.length ? out.join('; ') : null;
}

function cleanClass(raw: string): string | null {
  const kept = raw
    .split(/\s+/)
    .filter((c) => c && ALLOWED_CLASS_PREFIXES.some((p) => c.startsWith(p)))
    .slice(0, 8);
  return kept.length ? kept.join(' ') : null;
}

const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

function cleanAttributes(tag: string, attrString: string): string {
  const allowed = ALLOWED_ATTRS[tag] ?? ALLOWED_ATTRS['*'];
  const globalAllowed = ALLOWED_ATTRS['*'];
  const out: string[] = [];

  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(attrString))) {
    const name = m[1].toLowerCase();
    const value = m[3] ?? m[4] ?? m[5] ?? '';

    // Event handlers are never allowed, on any tag.
    if (name.startsWith('on')) continue;
    if (!allowed.has(name) && !globalAllowed.has(name)) continue;

    if (name === 'href') {
      const url = cleanUrl(value);
      if (!url) continue;
      out.push(`href="${escapeAttr(url)}"`);
      continue;
    }
    if (name === 'src') {
      const url = cleanImageSrc(value);
      if (!url) continue;
      out.push(`src="${escapeAttr(url)}"`);
      continue;
    }
    if (name === 'style') {
      const style = cleanStyle(value);
      if (!style) continue;
      out.push(`style="${escapeAttr(style)}"`);
      continue;
    }
    if (name === 'class') {
      const cls = cleanClass(value);
      if (!cls) continue;
      out.push(`class="${escapeAttr(cls)}"`);
      continue;
    }
    if (name === 'target') {
      out.push('target="_blank"');
      continue;
    }
    if (['width', 'height', 'colspan', 'rowspan', 'span', 'start'].includes(name)) {
      if (!/^\d{1,5}$/.test(value.trim())) continue;
      out.push(`${name}="${value.trim()}"`);
      continue;
    }
    out.push(`${name}="${escapeAttr(decodeEntities(value).slice(0, 300))}"`);
  }

  // Any link that opens a new tab must not hand the opener over with it.
  if (tag === 'a' && out.some((a) => a.startsWith('target='))) {
    if (!out.some((a) => a.startsWith('rel='))) out.push('rel="noopener noreferrer"');
  }
  if (tag === 'img' && !out.some((a) => a.startsWith('loading='))) {
    out.push('loading="lazy"');
  }

  return out.length ? ' ' + out.join(' ') : '';
}

/** Returns HTML containing only allowed tags, attributes and URLs. */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  let html = String(input);

  // Comments can hide markup from the tag matcher - remove them first.
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  // Remove dangerous elements together with everything inside them.
  for (const tag of VOID_CONTENT_TAGS) {
    html = html.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'), '');
    html = html.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'), '');
  }

  const openStack: string[] = [];

  const out = html.replace(
    /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)(\/?)\s*>/g,
    (_full, closing: string, rawTag: string, attrs: string, selfClose: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return '';

      if (closing) {
        const idx = openStack.lastIndexOf(tag);
        if (idx === -1) return '';
        openStack.splice(idx, 1);
        return `</${tag}>`;
      }

      if (SELF_CLOSING.has(tag)) return `<${tag}${cleanAttributes(tag, attrs)} />`;

      openStack.push(tag);
      void selfClose;
      return `<${tag}${cleanAttributes(tag, attrs)}>`;
    }
  );

  // Close anything the editor left open, innermost first.
  const tail = openStack.reverse().map((t) => `</${t}>`).join('');
  return (out + tail).trim();
}

/** Plain text from HTML - used for excerpts, search and meta descriptions. */
export function htmlToText(html: string, limit = 0): string {
  const text = String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (!limit || text.length <= limit) return text;
  return text.slice(0, text.lastIndexOf(' ', limit) || limit).trim() + '…';
}

/** Every <img src> in a piece of HTML, for building a gallery or a cover. */
export function extractImages(html: string): string[] {
  const out: string[] = [];
  const re = /<img\b[^>]*\bsrc\s*=\s*("([^"]*)"|'([^']*)')/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const src = m[2] ?? m[3];
    if (src && !src.startsWith('data:')) out.push(src);
  }
  return out;
}

/** Escapes text for safe insertion into HTML. */
export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
