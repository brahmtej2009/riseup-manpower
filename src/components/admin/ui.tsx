import Link from 'next/link';
import { ArrowUpRight, TrendingUp, TrendingDown, Minus, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn, formatNumber, STATUS_LABELS, STATUS_STYLES } from '@/lib/utils';

/** Building blocks shared across the admin screens. */

export function PageTitle({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn('card overflow-hidden', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            {title && <h2 className="font-display text-[0.9375rem] font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(bodyClassName ?? 'p-5')}>{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  change,
  hint,
  tone = 'default',
}: {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  href?: string;
  change?: number;
  hint?: string;
  tone?: 'default' | 'brand' | 'amber' | 'emerald' | 'rose';
}) {
  const tones = {
    default: 'bg-slate-100 text-ink-soft',
    brand: 'bg-brand-600/10 text-brand-700',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
  };

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.8125rem] font-medium text-ink-muted">{label}</p>
        {Icon && (
          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', tones[tone])}>
            <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
          </span>
        )}
      </div>

      <p className="mt-3 font-display text-[1.75rem] font-bold leading-none text-ink">
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>

      <div className="mt-2 flex items-center gap-2 text-xs">
        {change !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-semibold',
              change > 0 ? 'text-emerald-600' : change < 0 ? 'text-rose-600' : 'text-ink-muted'
            )}
          >
            {change > 0 ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : change < 0 ? (
              <TrendingDown className="h-3.5 w-3.5" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}
            {change > 0 ? '+' : ''}
            {change}%
          </span>
        )}
        {hint && <span className="text-ink-muted">{hint}</span>}
        {href && (
          <span className="ml-auto inline-flex items-center gap-0.5 font-medium text-brand-700">
            Open
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="card-hover block p-5">
        {inner}
      </Link>
    );
  }
  return <div className="card p-5">{inner}</div>;
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('chip', STATUS_STYLES[status] ?? 'bg-slate-100 text-ink-soft ring-slate-200')}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid place-items-center px-6 py-14 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-ink-muted">
        <Icon className="h-6 w-6" />
      </span>
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** GET form - keeps filters in the URL so a view can be bookmarked and shared. */
export function SearchBox({
  action,
  placeholder = 'Search…',
  defaultValue = '',
  hidden = {},
  className,
}: {
  action: string;
  placeholder?: string;
  defaultValue?: string;
  hidden?: Record<string, string | undefined>;
  className?: string;
}) {
  return (
    <form action={action} className={cn('relative', className)}>
      {Object.entries(hidden).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null
      )}
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className="field h-10 min-h-0 pl-9 text-sm"
      />
    </form>
  );
}

export function Pagination({
  page,
  pages,
  build,
}: {
  page: number;
  pages: number;
  build: (page: number) => string;
}) {
  if (pages <= 1) return null;

  const shown = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pages || Math.abs(p - page) <= 1
  );

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3"
      aria-label="Pagination"
    >
      <p className="text-xs text-ink-muted">
        Page {page} of {pages}
      </p>
      <div className="flex items-center gap-1">
        <Link
          href={build(Math.max(1, page - 1))}
          aria-disabled={page === 1}
          className={cn('btn-outline btn-sm', page === 1 && 'pointer-events-none opacity-40')}
        >
          Previous
        </Link>
        {shown.map((p, i) => (
          <span key={p} className="flex items-center">
            {i > 0 && shown[i - 1] !== p - 1 && <span className="px-1 text-ink-muted">…</span>}
            <Link
              href={build(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                'grid h-8 min-w-[2rem] place-items-center rounded-lg px-2 text-sm font-medium transition',
                p === page
                  ? 'bg-brand-600 text-white'
                  : 'border border-slate-200 text-ink-soft hover:border-slate-300'
              )}
            >
              {p}
            </Link>
          </span>
        ))}
        <Link
          href={build(Math.min(pages, page + 1))}
          aria-disabled={page === pages}
          className={cn('btn-outline btn-sm', page === pages && 'pointer-events-none opacity-40')}
        >
          Next
        </Link>
      </div>
    </nav>
  );
}

/** Tabs rendered as links, so each view has its own address. */
export function TabLinks({
  tabs,
  current,
}: {
  tabs: { href: string; label: string; count?: number; key: string }[];
  current: string;
}) {
  return (
    <div className="no-scrollbar -mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            'shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium transition',
            current === tab.key
              ? 'bg-ink text-white'
              : 'border border-slate-200 bg-white text-ink-soft hover:border-slate-300'
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn('ml-1.5', current === tab.key ? 'opacity-70' : 'text-ink-muted')}>
              {tab.count}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

/** A horizontal bar list, used all over the statistics screen. */
export function BarList({
  items,
  total,
  emptyText = 'No data yet.',
  formatLabel,
}: {
  items: { label: string; count: number; extra?: string }[];
  total?: number;
  emptyText?: string;
  formatLabel?: (label: string) => string;
}) {
  if (!items.length) return <p className="py-6 text-center text-sm text-ink-muted">{emptyText}</p>;

  const max = total ?? Math.max(...items.map((i) => i.count), 1);

  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.label} className="relative">
          <div className="relative flex items-center justify-between gap-4 rounded-lg px-2.5 py-2">
            <span
              className="absolute inset-y-0 left-0 rounded-lg bg-brand-600/[0.09]"
              style={{ width: `${Math.max(2, (item.count / max) * 100)}%` }}
              aria-hidden
            />
            <span className="relative min-w-0 truncate text-sm text-ink">
              {formatLabel ? formatLabel(item.label) : item.label}
            </span>
            <span className="relative flex shrink-0 items-baseline gap-2">
              {item.extra && <span className="text-[0.6875rem] text-ink-muted">{item.extra}</span>}
              <span className="text-sm font-semibold tabular-nums text-ink">
                {formatNumber(item.count)}
              </span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Definition list used on the detail screens. */
export function DetailList({
  items,
  columns = 2,
}: {
  items: [string, React.ReactNode][];
  columns?: 1 | 2;
}) {
  const visible = items.filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!visible.length) return <p className="text-sm text-ink-muted">Nothing recorded.</p>;

  return (
    <dl className={cn('grid gap-x-8 gap-y-4', columns === 2 ? 'sm:grid-cols-2' : '')}>
      {visible.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[0.6875rem] font-medium uppercase tracking-wide text-ink-muted">
            {label}
          </dt>
          <dd className="mt-0.5 break-words text-sm text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
