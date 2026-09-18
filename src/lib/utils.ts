/** Small helpers used by both server and client components. */

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function slugify(value: string): string {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/^-|-$/g, '');
}

export function initials(name: string): string {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** SQLite stores UTC as "YYYY-MM-DD HH:MM:SS" - make it a real Date. */
export function parseDbDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const iso = value.includes('T') ? value : value.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const DATE_FMT = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const DATETIME_FMT = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

export function formatDate(value: string | Date | null | undefined): string {
  const d = value instanceof Date ? value : parseDbDate(value as string);
  return d ? DATE_FMT.format(d) : '-';
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const d = value instanceof Date ? value : parseDbDate(value as string);
  return d ? DATETIME_FMT.format(d) : '-';
}

/** "3 days ago", "just now". */
export function timeAgo(value: string | Date | null | undefined): string {
  const d = value instanceof Date ? value : parseDbDate(value as string);
  if (!d) return '-';
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const units: [number, string][] = [
    [60, 'minute'],
    [3600, 'hour'],
    [86400, 'day'],
    [604800, 'week'],
    [2592000, 'month'],
    [31536000, 'year'],
  ];
  let value_ = seconds;
  let unit = 'second';
  for (let i = units.length - 1; i >= 0; i--) {
    if (seconds >= units[i][0]) {
      value_ = Math.floor(seconds / units[i][0]);
      unit = units[i][1];
      break;
    }
  }
  if (unit === 'second') return 'just now';
  return `${value_} ${unit}${value_ === 1 ? '' : 's'} ago`;
}

/** 1200 -> "1,200" using the Indian grouping the client is used to. */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

export function truncate(value: string, max: number): string {
  const s = String(value || '');
  if (s.length <= max) return s;
  return s.slice(0, s.lastIndexOf(' ', max) || max).trim() + '…';
}

/** Digits-only number for a wa.me link. */
export function whatsappLink(number: string, text?: string): string {
  const digits = String(number || '').replace(/\D/g, '');
  if (!digits) return '';
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${digits}${q}`;
}

export function telLink(number: string): string {
  const cleaned = String(number || '').replace(/[^\d+]/g, '');
  return cleaned ? `tel:${cleaned}` : '';
}

/** Parses a JSON column, returning a fallback rather than throwing. */
export function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'object') return value as T;
  try {
    const parsed = JSON.parse(String(value));
    return parsed == null ? fallback : (parsed as T);
  } catch {
    return fallback;
  }
}

export const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  approved: 'Approved',
  rejected: 'Rejected',
  in_progress: 'In progress',
  placed: 'Placed',
  on_hold: 'On hold',
  closed: 'Closed',
  unread: 'Unread',
  read: 'Read',
  archived: 'Archived',
  draft: 'Draft',
  published: 'Published',
};

export const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  reviewing: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  in_progress: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  placed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  on_hold: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  closed: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  unread: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  read: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  archived: 'bg-slate-100 text-slate-500 ring-slate-500/20',
  draft: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  published: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
};

/** Builds a CSV file from rows, quoting correctly. */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // The BOM makes Excel open UTF-8 correctly on Windows.
  return '﻿' + [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
}
