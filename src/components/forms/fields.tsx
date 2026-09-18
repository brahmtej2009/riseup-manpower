'use client';

import { useId, type ReactNode } from 'react';
import { AlertCircle, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Shared form controls. Every one of them shows its own error message. */

interface BaseProps {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

function FieldShell({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label">
        {label}
        {required && <span className="ml-0.5 text-rose-600">*</span>}
      </label>
      {children}
      {hint && !error && <p className="help">{hint}</p>}
      {error && (
        <p className="error-text" role="alert">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({
  label, name, error, hint, required, className,
  type = 'text', value, onChange, placeholder, autoComplete, inputMode, max, maxLength,
}: BaseProps & {
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'tel' | 'email' | 'numeric' | 'decimal';
  max?: string;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <FieldShell label={label} htmlFor={id} error={error} hint={hint} required={required} className={className}>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        max={max}
        maxLength={maxLength}
        aria-invalid={!!error}
        className={cn('field', error && 'field-error')}
      />
    </FieldShell>
  );
}

export function Textarea({
  label, name, error, hint, required, className, value, onChange, placeholder, rows = 4, maxLength,
}: BaseProps & {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <FieldShell label={label} htmlFor={id} error={error} hint={hint} required={required} className={className}>
      <textarea
        id={id}
        name={name}
        rows={rows}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error}
        className={cn('field', error && 'field-error')}
      />
      {maxLength && (
        <p className="mt-1 text-right text-[0.6875rem] text-ink-muted">
          {value.length} / {maxLength}
        </p>
      )}
    </FieldShell>
  );
}

export function Select({
  label, name, error, hint, required, className, value, onChange, options, placeholder = 'Select…',
}: BaseProps & {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const id = useId();
  return (
    <FieldShell label={label} htmlFor={id} error={error} hint={hint} required={required} className={className}>
      <div className="relative">
        <select
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          className={cn('field', error && 'field-error', !value && 'text-ink-muted')}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o} className="text-ink">
              {o}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      </div>
    </FieldShell>
  );
}

/** Multi-select rendered as tick-boxes - clearer than a multiple <select>. */
export function CheckboxGroup({
  label, name, error, hint, required, className, values, onChange, options, columns = 2,
}: BaseProps & {
  values: string[];
  onChange: (v: string[]) => void;
  options: string[];
  columns?: 1 | 2 | 3;
}) {
  const toggle = (option: string) =>
    onChange(values.includes(option) ? values.filter((v) => v !== option) : [...values, option]);

  return (
    <div className={className}>
      <p className="label">
        {label}
        {required && <span className="ml-0.5 text-rose-600">*</span>}
      </p>
      {hint && !error && <p className="-mt-1 mb-2 text-xs text-ink-muted">{hint}</p>}

      <div
        className={cn(
          'grid gap-2',
          columns === 1 ? 'grid-cols-1' : columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
        )}
      >
        {options.map((option) => {
          const checked = values.includes(option);
          return (
            <label
              key={option}
              className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition',
                checked
                  ? 'border-brand-600 bg-brand-50/70 text-ink'
                  : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-surface-soft'
              )}
            >
              <input
                type="checkbox"
                name={name}
                value={option}
                checked={checked}
                onChange={() => toggle(option)}
                className="sr-only"
              />
              <span
                className={cn(
                  'mt-px grid h-[1.125rem] w-[1.125rem] shrink-0 place-items-center rounded-[0.3rem] border transition',
                  checked ? 'border-brand-600 bg-brand-600 text-white' : 'border-line-strong bg-surface'
                )}
                aria-hidden
              >
                {checked && <Check className="h-3 w-3" strokeWidth={3.5} />}
              </span>
              <span className="leading-snug">{option}</span>
            </label>
          );
        })}
      </div>

      {error && (
        <p className="error-text" role="alert">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export function RadioPills({
  label, name, error, required, className, value, onChange, options,
}: BaseProps & {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className={className}>
      <p className="label">
        {label}
        {required && <span className="ml-0.5 text-rose-600">*</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option;
          return (
            <label
              key={option}
              className={cn(
                'cursor-pointer rounded-xl border px-4 py-2 text-sm font-medium transition',
                active
                  ? 'border-brand-600 bg-brand-600 text-white shadow-[0_4px_14px_-6px_rgb(var(--brand-600)/0.9)]'
                  : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-surface-soft'
              )}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={active}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              {option}
            </label>
          );
        })}
      </div>
      {error && (
        <p className="error-text" role="alert">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({
  name, checked, onChange, error, children,
}: {
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-soft">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span
          className={cn(
            'mt-0.5 grid h-[1.125rem] w-[1.125rem] shrink-0 place-items-center rounded-[0.3rem] border transition',
            checked ? 'border-brand-600 bg-brand-600 text-white' : 'border-line-strong bg-surface',
            error && !checked && 'border-rose-400'
          )}
          aria-hidden
        >
          {checked && <Check className="h-3 w-3" strokeWidth={3.5} />}
        </span>
        <span>{children}</span>
      </label>
      {error && (
        <p className="error-text" role="alert">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Hidden field that people never see but automated form-fillers do.
 * If it arrives filled in, the submission is dropped.
 */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden" >
      <label htmlFor="website_url">Leave this field empty</label>
      <input
        id="website_url"
        name="website_url"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function FileField({
  label, name, error, hint, required, className, accept, file, onChange, maxMb,
}: BaseProps & {
  accept: string;
  file: File | null;
  onChange: (f: File | null) => void;
  maxMb: number;
}) {
  const id = useId();
  return (
    <FieldShell label={label} htmlFor={id} error={error} hint={hint} required={required} className={className}>
      <label
        htmlFor={id}
        className={cn(
          'flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3.5 text-sm transition',
          file ? 'border-brand-400 bg-brand-50/50' : 'border-line-strong bg-surface hover:border-brand-400 hover:bg-surface-soft',
          error && 'border-rose-400'
        )}
      >
        <span className={cn('truncate', file ? 'font-medium text-ink' : 'text-ink-muted')}>
          {file ? file.name : `Choose a file (up to ${maxMb} MB)`}
        </span>
        <span className="shrink-0 rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-line">
          {file ? 'Change' : 'Browse'}
        </span>
      </label>
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {file && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-1.5 text-xs font-medium text-rose-600 hover:underline"
        >
          Remove file
        </button>
      )}
    </FieldShell>
  );
}
