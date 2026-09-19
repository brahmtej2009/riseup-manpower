'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImagePicker } from '@/components/admin/ImagePicker';
import { GalleryPicker } from '@/components/admin/GalleryPicker';
import type { SettingRow } from '@/lib/settings';

/**
 * One setting, drawn as compactly as it can honestly be drawn.
 *
 * The explanation is behind the small information button rather than printed
 * under every field. Most settings do not need reading twice, and a column of
 * grey paragraphs is what made the old screen unusable.
 */
export function FieldControl({ row }: { row: SettingRow }) {
  const [showHint, setShowHint] = useState(false);
  const id = `f-${row.key}`;
  const label = row.label || row.key;

  const hintButton = row.hint ? (
    <button
      type="button"
      onClick={() => setShowHint((v) => !v)}
      aria-label={showHint ? 'Hide the explanation' : 'What is this?'}
      aria-expanded={showHint}
      className={cn(
        'grid h-4 w-4 shrink-0 place-items-center rounded-full transition',
        showHint ? 'bg-brand-600 text-white' : 'text-ink-muted hover:text-brand-600'
      )}
    >
      <Info className="h-3.5 w-3.5" />
    </button>
  ) : null;

  const hint = showHint && row.hint ? (
    <p className="mt-1.5 rounded-lg bg-surface-soft px-2.5 py-2 text-[0.6875rem] leading-relaxed text-ink-soft">
      {row.hint}
    </p>
  ) : null;

  // ---------------------------------------------------------------- tick box
  if (row.type === 'bool') {
    return (
      <div>
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            name={row.key}
            defaultChecked={row.value === '1'}
            className="h-4 w-4 shrink-0 rounded border-line-strong text-brand-600 focus:ring-brand-600"
          />
          <span className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="truncate text-[0.8125rem] text-ink">{label}</span>
            {hintButton}
          </span>
        </label>
        {hint}
      </div>
    );
  }

  const labelRow = (
    <span className="mb-1 flex items-center gap-1.5">
      <label htmlFor={id} className="text-[0.75rem] font-medium text-ink">
        {label}
      </label>
      {hintButton}
    </span>
  );

  // ---------------------------------------------------------------- dropdown
  if (row.type === 'select') {
    let opts: { value: string; label: string }[] = [];
    try {
      const parsed = JSON.parse(row.options || '[]');
      if (Array.isArray(parsed)) {
        opts = parsed.map((o) => ({ value: String(o.value), label: String(o.label ?? o.value) }));
      }
    } catch {
      opts = [];
    }

    return (
      <div>
        {labelRow}
        <select id={id} name={row.key} defaultValue={row.value} className="field h-9 min-h-0 py-0 text-[0.8125rem]">
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {hint}
      </div>
    );
  }

  // ----------------------------------------------------------------- colour
  if (row.type === 'color') {
    return (
      <div>
        {labelRow}
        <div className="flex items-center gap-2">
          <input
            id={id}
            name={row.key}
            type="color"
            defaultValue={row.value || '#1877D9'}
            className="h-9 w-14 cursor-pointer rounded-lg border border-line-strong bg-surface p-1"
          />
          <span className="font-mono text-[0.6875rem] text-ink-muted">{row.value}</span>
        </div>
        {hint}
      </div>
    );
  }

  // ------------------------------------------------------------------ image
  if (row.type === 'image') {
    return (
      <div>
        {labelRow}
        <ImagePicker
          name={row.key}
          value={row.value}
          folder="branding"
          square={row.key.includes('logo') || row.key.includes('favicon')}
          maxSize={row.key.includes('favicon') ? 256 : 1200}
          aspect={row.key.includes('og_image') ? 'wide' : 'square'}
        />
        {hint}
      </div>
    );
  }

  // ---------------------------------------------------------------- gallery
  if (row.type === 'gallery') {
    let list: string[] = [];
    try {
      const parsed = JSON.parse(row.value || '[]');
      if (Array.isArray(parsed)) list = parsed.map(String).filter(Boolean);
    } catch {
      list = [];
    }
    return (
      <div>
        {labelRow}
        <GalleryPicker name={row.key} value={list} />
        {hint}
      </div>
    );
  }

  // ------------------------------------------------------- one item per line
  if (row.type === 'json') {
    let asLines = row.value;
    try {
      const parsed = JSON.parse(row.value || '[]');
      if (Array.isArray(parsed)) asLines = parsed.join('\n');
    } catch {
      /* leave it as it is */
    }
    return (
      <div>
        {labelRow}
        <textarea
          id={id}
          name={row.key}
          rows={3}
          defaultValue={asLines}
          placeholder="One per line"
          className="field text-[0.8125rem]"
        />
        {hint}
      </div>
    );
  }

  // ------------------------------------------------------------------- text
  const isNumber = row.type === 'number';
  return (
    <div>
      {labelRow}
      {row.type === 'textarea' ? (
        <textarea id={id} name={row.key} rows={2} defaultValue={row.value} className="field text-[0.8125rem]" />
      ) : (
        <input
          id={id}
          name={row.key}
          type="text"
          inputMode={isNumber ? 'numeric' : undefined}
          defaultValue={row.value}
          className={cn('field h-9 min-h-0 text-[0.8125rem]', isNumber && 'w-24')}
        />
      )}
      {hint}
    </div>
  );
}
