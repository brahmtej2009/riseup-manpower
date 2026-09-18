import { formatNumber } from '@/lib/utils';

/**
 * Charts drawn as plain SVG on the server.
 *
 * No charting library: the admin panel stays light, there is nothing extra to
 * download, and these render inside the HTML so they are visible immediately.
 */

export interface Point {
  day: string;
  visitors: number;
  views: number;
  submissions: number;
}

function niceMax(value: number): number {
  if (value <= 5) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  return Math.ceil(value / pow) * pow;
}

function shortDate(day: string): string {
  const d = new Date(day + 'T00:00:00Z');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** Area chart of visitors and page views, with submission markers. */
export function TrendChart({ data, height = 220 }: { data: Point[]; height?: number }) {
  if (data.length < 2) {
    return (
      <p className="grid h-40 place-items-center text-sm text-ink-muted">
        Not enough data yet - this fills in as people visit the site.
      </p>
    );
  }

  const W = 900;
  const H = height;
  const padL = 42;
  const padR = 12;
  const padT = 14;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const max = niceMax(Math.max(...data.map((d) => Math.max(d.views, d.visitors)), 1));
  const x = (i: number) => padL + (i / (data.length - 1)) * innerW;
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  const line = (key: 'visitors' | 'views') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ');

  const area = (key: 'visitors' | 'views') =>
    `${line(key)} L${x(data.length - 1).toFixed(1)},${padT + innerH} L${padL},${padT + innerH} Z`;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  // Roughly six labels, however many days are shown.
  const step = Math.max(1, Math.ceil(data.length / 6));

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Visitors and page views over time"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--brand-600))" stopOpacity="0.20" />
            <stop offset="100%" stopColor="rgb(var(--brand-600))" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="visitorsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--accent-500))" stopOpacity="0.18" />
            <stop offset="100%" stopColor="rgb(var(--accent-500))" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
              {formatNumber(t)}
            </text>
          </g>
        ))}

        <path d={area('views')} fill="url(#viewsFill)" />
        <path d={line('views')} fill="none" stroke="rgb(var(--brand-600))" strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

        <path d={area('visitors')} fill="url(#visitorsFill)" />
        <path d={line('visitors')} fill="none" stroke="rgb(var(--accent-500))" strokeWidth="2"
          strokeDasharray="5 4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

        {/* A dot for each day that produced a form submission. */}
        {data.map((d, i) =>
          d.submissions > 0 ? (
            <circle key={d.day} cx={x(i)} cy={y(d.views)} r="4" fill="#fff"
              stroke="rgb(var(--brand-700))" strokeWidth="2.5">
              <title>{`${shortDate(d.day)} - ${d.submissions} submission(s)`}</title>
            </circle>
          ) : null
        )}

        {data.map((d, i) =>
          i % step === 0 || i === data.length - 1 ? (
            <text key={d.day} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#94a3b8">
              {shortDate(d.day)}
            </text>
          ) : null
        )}
      </svg>

      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-brand-600" />
          Page views
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-accent-500" />
          Unique visitors
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border-2 border-brand-700 bg-white" />
          Days with a form submission
        </span>
      </figcaption>
    </figure>
  );
}

/** Column chart, used for the hour-of-day pattern. */
export function HourChart({ hours }: { hours: number[] }) {
  const max = Math.max(...hours, 1);
  const busiest = hours.indexOf(max);

  return (
    <figure>
      <div className="flex h-32 items-end gap-[2px]">
        {hours.map((count, hour) => (
          <div key={hour} className="group relative flex-1">
            <div
              className={`w-full rounded-t transition-colors ${
                hour === busiest ? 'bg-brand-600' : 'bg-brand-600/25 group-hover:bg-brand-600/50'
              }`}
              style={{ height: `${Math.max(2, (count / max) * 112)}px` }}
            />
            <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[0.625rem] text-white group-hover:block">
              {hour}:00 - {count}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[0.625rem] text-ink-muted">
        {[0, 6, 12, 18, 23].map((h) => (
          <span key={h}>{h}:00</span>
        ))}
      </div>
      <figcaption className="mt-2 text-xs text-ink-muted">
        Busiest hour: {busiest}:00 – {busiest + 1}:00
      </figcaption>
    </figure>
  );
}

/** Funnel from visit through to an approved contact. */
export function Funnel({ steps }: { steps: { label: string; count: number; note: string }[] }) {
  const top = Math.max(steps[0]?.count ?? 1, 1);

  return (
    <ol className="space-y-2.5">
      {steps.map((step, i) => {
        const pct = Math.round((step.count / top) * 100);
        const prev = steps[i - 1];
        const dropOff = prev && prev.count > 0 ? Math.round((step.count / prev.count) * 100) : null;

        return (
          <li key={step.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-ink">{step.label}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                {formatNumber(step.count)}
                {dropOff !== null && (
                  <span className="ml-2 text-xs font-normal text-ink-muted">{dropOff}% of previous</span>
                )}
              </span>
            </div>
            <div className="h-7 overflow-hidden rounded-lg bg-slate-100">
              <div
                className="flex h-full items-center rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-2.5"
                style={{ width: `${Math.max(pct, 3)}%` }}
              >
                <span className="whitespace-nowrap text-[0.6875rem] font-medium text-white/90">
                  {pct}%
                </span>
              </div>
            </div>
            <p className="mt-0.5 text-[0.6875rem] text-ink-muted">{step.note}</p>
          </li>
        );
      })}
    </ol>
  );
}

/** Small inline sparkline for a stat card. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const W = 100;
  const H = 24;
  const d = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (values.length - 1)) * W},${H - (v / max) * H}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
