'use client';

import { useState } from 'react';
import { Save, Send, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActionForm } from '@/components/admin/BulkForm';
import { SubmitButton } from '@/components/admin/interactive';
import { ImagePicker } from '@/components/admin/ImagePicker';
import { GalleryPicker } from '@/components/admin/GalleryPicker';
import type { ActionResult } from '@/lib/admin-actions';
import type { SettingRow } from '@/lib/settings';

/**
 * Renders a settings group from the database.
 *
 * The control used for each key comes from the `type` column, so a setting
 * added in a later migration appears here with the right input automatically.
 */
export function SettingsForm({
  group,
  rows,
  editable,
  save,
  testEmail,
  testFeed,
}: {
  group: string;
  rows: SettingRow[];
  editable: boolean;
  save: (fd: FormData) => Promise<ActionResult>;
  testEmail?: () => Promise<ActionResult>;
  testFeed?: () => Promise<ActionResult>;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-ink-muted">There are no settings in this group.</p>;
  }

  return (
    <ActionForm action={save} hidden={{ __group: group }} className="space-y-5">
      <fieldset disabled={!editable} className="space-y-5">
        {rows.map((row) => (
          <Field key={row.key} row={row} />
        ))}
      </fieldset>

      {editable && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
          <SubmitButton className="btn-primary" icon={<Save className="h-4 w-4" />}>
            Save these settings
          </SubmitButton>

          {testEmail && <TestButton run={testEmail} label="Send a test email" />}
          {testFeed && <TestButton run={testFeed} label="Test the connection" />}
        </div>
      )}
    </ActionForm>
  );
}

function TestButton({ run, label }: { run: () => Promise<ActionResult>; label: string }) {
  const [state, setState] = useState<ActionResult | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setState(await run());
          setBusy(false);
        }}
        className="btn-outline"
      >
        {busy ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
            Sending…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            {label}
          </>
        )}
      </button>

      {state && (
        <span
          className={cn(
            'text-sm',
            state.ok ? 'text-emerald-700' : 'text-rose-700'
          )}
        >
          {state.ok ? state.message : state.error}
        </span>
      )}
    </>
  );
}

function Field({ row }: { row: SettingRow }) {
  const id = `set-${row.key}`;

  // JSON lists are edited as one item per line - much easier than raw JSON.
  const jsonAsLines = (value: string) => {
    try {
      const parsed = JSON.parse(value || '[]');
      return Array.isArray(parsed) ? parsed.join('\n') : value;
    } catch {
      return value;
    }
  };

  if (row.type === 'bool') {
    const on = row.value === '1';
    return (
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
        <input
          type="checkbox"
          name={row.key}
          defaultChecked={on}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-ink">{row.label || row.key}</span>
          {row.hint && <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{row.hint}</span>}
        </span>
      </label>
    );
  }

  if (row.type === 'image') {
    return (
      <div>
        <ImagePicker
          name={row.key}
          value={row.value}
          label={row.label || row.key}
          hint={row.hint}
          folder="branding"
          square={row.key.includes('logo') || row.key.includes('favicon')}
          maxSize={row.key.includes('favicon') ? 256 : 1200}
          aspect={row.key.includes('og_image') || row.key.includes('hero') ? 'wide' : 'square'}
        />
      </div>
    );
  }

  if (row.type === 'gallery') {
    let list: string[] = [];
    try {
      const parsed = JSON.parse(row.value || '[]');
      if (Array.isArray(parsed)) list = parsed.map(String).filter(Boolean);
    } catch {
      list = [];
    }
    return (
      <GalleryPicker name={row.key} value={list} label={row.label || row.key} hint={row.hint} />
    );
  }

  if (row.type === 'color') {
    return (
      <div>
        <label className="label" htmlFor={id}>{row.label || row.key}</label>
        <div className="flex items-center gap-3">
          <input
            id={id}
            name={row.key}
            type="color"
            defaultValue={row.value || '#1552F0'}
            className="h-11 w-16 cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
          />
          <output className="font-mono text-sm text-ink-muted">{row.value}</output>
        </div>
        {row.hint && <p className="help">{row.hint}</p>}
      </div>
    );
  }

  if (row.type === 'json') {
    return (
      <div>
        <label className="label" htmlFor={id}>{row.label || row.key}</label>
        <textarea
          id={id}
          name={row.key}
          rows={Math.min(14, Math.max(4, jsonAsLines(row.value).split('\n').length + 1))}
          defaultValue={jsonAsLines(row.value)}
          className="field font-mono text-[0.8125rem]"
        />
        <p className="help">{row.hint || 'One item per line.'}</p>
      </div>
    );
  }

  if (row.type === 'textarea' || row.type === 'html') {
    return (
      <div>
        <label className="label" htmlFor={id}>{row.label || row.key}</label>
        <textarea
          id={id}
          name={row.key}
          rows={row.type === 'html' ? 8 : 3}
          defaultValue={row.value}
          className={cn('field', row.type === 'html' && 'font-mono text-[0.8125rem]')}
        />
        {row.hint && <p className="help">{row.hint}</p>}
      </div>
    );
  }

  if (row.type === 'password') {
    return (
      <div>
        <label className="label" htmlFor={id}>{row.label || row.key}</label>
        <input
          id={id}
          name={row.key}
          type="password"
          defaultValue={row.value}
          autoComplete="new-password"
          className="field"
        />
        {row.hint && (
          <p className="help flex items-start gap-1">
            <AlertCircle className="mt-px h-3 w-3 shrink-0 text-amber-600" />
            {row.hint}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <label className="label" htmlFor={id}>{row.label || row.key}</label>
      <input
        id={id}
        name={row.key}
        type={row.type === 'number' ? 'text' : 'text'}
        inputMode={row.type === 'number' ? 'numeric' : undefined}
        defaultValue={row.value}
        className="field"
      />
      {row.hint && <p className="help">{row.hint}</p>}
    </div>
  );
}
