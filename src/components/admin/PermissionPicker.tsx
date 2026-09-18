'use client';

import { useState } from 'react';
import { Check, ShieldCheck, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PERMISSION_GROUPS, ROLE_PRESETS } from '@/lib/permissions';

/**
 * Tick-boxes for every capability in the system, grouped by area.
 *
 * The list is generated from the permission registry, so a feature added
 * later shows up here on its own - nothing to remember to update.
 */
export function PermissionPicker({
  selected,
  role,
  isSuper,
}: {
  selected: string[];
  role: string;
  isSuper: boolean;
}) {
  const [chosen, setChosen] = useState<Set<string>>(new Set(selected));
  const [superAdmin, setSuperAdmin] = useState(isSuper);
  const [activeRole, setActiveRole] = useState(role);

  const toggle = (key: string) => {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setActiveRole('custom');
  };

  const toggleGroup = (keys: string[], on: boolean) => {
    setChosen((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => (on ? next.add(k) : next.delete(k)));
      return next;
    });
    setActiveRole('custom');
  };

  const applyPreset = (presetKey: string) => {
    const preset = ROLE_PRESETS[presetKey];
    if (!preset) return;
    setActiveRole(presetKey);
    if (presetKey === 'super_admin') {
      setSuperAdmin(true);
      return;
    }
    setSuperAdmin(false);
    setChosen(new Set(preset.permissions));
  };

  return (
    <div className="space-y-5">
      {/* Role presets */}
      <div>
        <span className="label">Start from a role</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(ROLE_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className={cn(
                'rounded-xl border p-3 text-left transition',
                activeRole === key
                  ? 'border-brand-600 bg-brand-50/70 ring-1 ring-brand-600/20'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                {key === 'super_admin' && <ShieldCheck className="h-3.5 w-3.5 text-brand-700" />}
                {preset.label}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                {preset.description}
              </span>
            </button>
          ))}
        </div>
        <input type="hidden" name="role" value={superAdmin ? 'super_admin' : activeRole === 'custom' ? 'staff' : activeRole} />
      </div>

      {/* Super admin */}
      <label
        className={cn(
          'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition',
          superAdmin ? 'border-brand-600 bg-brand-50/70' : 'border-slate-200 hover:bg-slate-50'
        )}
      >
        <input
          type="checkbox"
          name="is_super"
          checked={superAdmin}
          onChange={(e) => {
            setSuperAdmin(e.target.checked);
            if (e.target.checked) setActiveRole('super_admin');
          }}
          className="sr-only"
        />
        <span
          className={cn(
            'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition',
            superAdmin ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white'
          )}
        >
          {superAdmin && <Check className="h-3 w-3" strokeWidth={3.5} />}
        </span>
        <span>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <ShieldCheck className="h-4 w-4 text-brand-700" />
            Super admin
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
            Full access to everything, now and to anything added later. The tick-boxes below are
            ignored. Give this only to the people who run the business.
          </span>
        </span>
      </label>

      {/* Individual permissions */}
      <div className={cn('space-y-3', superAdmin && 'pointer-events-none opacity-40')}>
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <Info className="h-3.5 w-3.5" />
          {superAdmin
            ? 'A super admin has every permission, so these are not used.'
            : `${chosen.size} permission${chosen.size === 1 ? '' : 's'} selected.`}
        </div>

        {PERMISSION_GROUPS.map((group) => {
          const keys = group.permissions.map((p) => p.key);
          const allOn = keys.every((k) => chosen.has(k));
          const someOn = keys.some((k) => chosen.has(k));

          return (
            <fieldset key={group.key} className="rounded-xl border border-slate-200">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                <legend className="contents">
                  <span className="text-sm font-semibold text-ink">{group.label}</span>
                </legend>
                <button
                  type="button"
                  onClick={() => toggleGroup(keys, !allOn)}
                  className={cn(
                    'rounded-lg px-2 py-1 text-xs font-medium transition',
                    allOn
                      ? 'text-ink-muted hover:bg-slate-200'
                      : 'text-brand-700 hover:bg-brand-100'
                  )}
                >
                  {allOn ? 'Clear all' : someOn ? 'Select all' : 'Select all'}
                </button>
              </div>

              <p className="px-4 pt-2 text-xs text-ink-muted">{group.description}</p>

              <div className="grid gap-1 p-2 sm:grid-cols-2">
                {group.permissions.map((permission) => {
                  const on = chosen.has(permission.key);
                  return (
                    <label
                      key={permission.key}
                      className={cn(
                        'flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm transition',
                        on ? 'bg-brand-50/70 text-ink' : 'text-ink-soft hover:bg-slate-50'
                      )}
                    >
                      <input
                        type="checkbox"
                        name="permissions"
                        value={permission.key}
                        checked={on}
                        onChange={() => toggle(permission.key)}
                        className="sr-only"
                      />
                      <span
                        className={cn(
                          'mt-px grid h-4 w-4 shrink-0 place-items-center rounded border transition',
                          on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white'
                        )}
                      >
                        {on && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
                      </span>
                      <span className="leading-snug">
                        {permission.label}
                        {permission.note && (
                          <span className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[0.625rem] font-medium text-amber-800">
                            {permission.note}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}
