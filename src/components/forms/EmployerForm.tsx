'use client';

import { useRef, useState } from 'react';
import { employerSchema, fieldErrors } from '@/lib/validation';
import { trackEvent } from '@/components/site/Tracker';
import { Input, Textarea, Select, CheckboxGroup, RadioPills, Checkbox, Honeypot } from './fields';
import { StepProgress, StepPanel, FormNav, FormError, SuccessScreen, type Step } from './FormShell';

const STEPS: Step[] = [
  { id: 'company', title: 'Company' },
  { id: 'contact', title: 'Contact person' },
  { id: 'location', title: 'Location' },
  { id: 'requirement', title: 'Requirement' },
];

/** Which fields belong to which step, so validation only blocks on the current one. */
const STEP_FIELDS: string[][] = [
  ['company_name', 'industry', 'year_established', 'website', 'gst_no'],
  ['contact_person', 'designation', 'email', 'phone', 'alt_phone'],
  ['address_line', 'city', 'district', 'state', 'pincode'],
  ['manpower_types', 'workers_required', 'skill_level', 'shift', 'salary_range',
   'work_location', 'accommodation', 'food', 'urgency', 'requirements', 'consent'],
];

export interface EmployerOptions {
  industries: string[];
  states: string[];
  jobCategories: string[];
  skillLevels: string[];
  shifts: string[];
  urgency: string[];
  note: string;
  successMessage: string;
}

const initial = {
  company_name: '', industry: '', year_established: '', website: '', gst_no: '',
  contact_person: '', designation: '', email: '', phone: '', alt_phone: '',
  address_line: '', city: '', district: '', state: '', pincode: '',
  manpower_types: [] as string[], workers_required: '', skill_level: '', shift: '',
  salary_range: '', work_location: '', accommodation: '', food: '', urgency: '',
  requirements: '', consent: false, website_url: '',
};

export function EmployerForm({ options }: { options: EmployerOptions }) {
  const [data, setData] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [reference, setReference] = useState('');
  const started = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof typeof initial>(key: K, value: (typeof initial)[K]) => {
    if (!started.current) {
      started.current = true;
      trackEvent('form.start', { category: 'form', label: 'employer' });
    }
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => (e[key as string] ? { ...e, [key as string]: '' } : e));
  };

  /** Validates the whole form, then keeps only the current step's errors. */
  const validateStep = (index: number): boolean => {
    const result = employerSchema.safeParse(data);
    if (result.success) return true;
    const all = fieldErrors(result.error);
    const mine: Record<string, string> = {};
    for (const f of STEP_FIELDS[index]) if (all[f]) mine[f] = all[f];
    setErrors(mine);
    return Object.keys(mine).length === 0;
  };

  const scrollUp = () =>
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const back = () => {
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
    setErrors({});
    scrollUp();
  };

  const next = async () => {
    if (!validateStep(step)) return;
    if (step < STEPS.length - 1) {
      setDirection(1);
      setStep((s) => s + 1);
      scrollUp();
      return;
    }
    await submit();
  };

  const submit = async () => {
    const result = employerSchema.safeParse(data);
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      setFormError('Some details are missing. Please check the highlighted fields.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const res = await fetch('/api/register/employer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (body.fields) setErrors(body.fields);
        setFormError(body.error || 'Something went wrong. Please try again, or call us directly.');
        setSubmitting(false);
        return;
      }

      trackEvent('form.submit', { category: 'form', label: 'employer' });
      setReference(body.reference);
    } catch {
      setFormError('We could not reach the server. Please check your connection and try again.');
      setSubmitting(false);
    }
  };

  if (reference) {
    return <SuccessScreen reference={reference} message={options.successMessage} type="employer" />;
  }

  return (
    <div ref={topRef} className="card scroll-mt-28 p-6 sm:p-8">
      <StepProgress steps={STEPS} current={step} />
      <FormError message={formError} />

      <form onSubmit={(e) => { e.preventDefault(); void next(); }} noValidate>
        <Honeypot value={data.website_url} onChange={(v) => set('website_url', v)} />

        <StepPanel stepKey={STEPS[step].id} direction={direction}>
          {step === 0 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label="Company name" name="company_name" required className="sm:col-span-2"
                value={data.company_name} onChange={(v) => set('company_name', v)}
                placeholder="e.g. Shakti Auto Components Pvt Ltd" autoComplete="organization" />
              <Select label="Industry" name="industry" required options={options.industries}
                value={data.industry} onChange={(v) => set('industry', v)} error={errors.industry} />
              <Input label="Year established" name="year_established" type="text" inputMode="numeric"
                maxLength={4} value={data.year_established} onChange={(v) => set('year_established', v)}
                placeholder="e.g. 2012" error={errors.year_established} />
              <Input label="Company website" name="website" value={data.website}
                onChange={(v) => set('website', v)} placeholder="Optional" error={errors.website} />
              <Input label="GST / registration number" name="gst_no" value={data.gst_no}
                onChange={(v) => set('gst_no', v)} placeholder="Optional" error={errors.gst_no} />
              {errors.company_name && <p className="error-text sm:col-span-2">{errors.company_name}</p>}
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label="Contact person" name="contact_person" required value={data.contact_person}
                onChange={(v) => set('contact_person', v)} error={errors.contact_person}
                placeholder="Full name" autoComplete="name" />
              <Input label="Designation" name="designation" value={data.designation}
                onChange={(v) => set('designation', v)} error={errors.designation}
                placeholder="e.g. HR Manager" />
              <Input label="Email address" name="email" type="email" required inputMode="email"
                value={data.email} onChange={(v) => set('email', v)} error={errors.email}
                placeholder="name@company.com" autoComplete="email" />
              <Input label="Phone number" name="phone" type="tel" required inputMode="tel"
                value={data.phone} onChange={(v) => set('phone', v)} error={errors.phone}
                placeholder="+91 00000 00000" autoComplete="tel" />
              <Input label="Alternate phone" name="alt_phone" type="tel" inputMode="tel"
                value={data.alt_phone} onChange={(v) => set('alt_phone', v)} error={errors.alt_phone}
                placeholder="Optional" />
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label="Address" name="address_line" className="sm:col-span-2"
                value={data.address_line} onChange={(v) => set('address_line', v)}
                error={errors.address_line} placeholder="Building, street, area" />
              <Input label="City" name="city" required value={data.city}
                onChange={(v) => set('city', v)} error={errors.city} />
              <Input label="District" name="district" value={data.district}
                onChange={(v) => set('district', v)} error={errors.district} />
              <Select label="State" name="state" required options={options.states}
                value={data.state} onChange={(v) => set('state', v)} error={errors.state} />
              <Input label="PIN code" name="pincode" inputMode="numeric" maxLength={6}
                value={data.pincode} onChange={(v) => set('pincode', v)} error={errors.pincode} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <CheckboxGroup label="Type of manpower required" name="manpower_types" required
                options={options.jobCategories} values={data.manpower_types}
                onChange={(v) => set('manpower_types', v)} error={errors.manpower_types}
                hint="Select every category you need. You can add detail at the bottom." />

              <div className="grid gap-5 sm:grid-cols-2">
                <Input label="Number of workers required" name="workers_required" required
                  inputMode="numeric" value={data.workers_required}
                  onChange={(v) => set('workers_required', v)} error={errors.workers_required}
                  placeholder="e.g. 25" />
                <Select label="Skill level" name="skill_level" options={options.skillLevels}
                  value={data.skill_level} onChange={(v) => set('skill_level', v)} />
                <Select label="Shift / duty pattern" name="shift" options={options.shifts}
                  value={data.shift} onChange={(v) => set('shift', v)} />
                <Input label="Salary / wage offered" name="salary_range" value={data.salary_range}
                  onChange={(v) => set('salary_range', v)} placeholder="e.g. Rs. 16,000 - Rs. 22,000" />
                <Input label="Work location" name="work_location" className="sm:col-span-2"
                  value={data.work_location} onChange={(v) => set('work_location', v)}
                  placeholder="Where the staff will be deployed" />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <RadioPills label="Accommodation provided" name="accommodation" options={['Yes', 'No']}
                  value={data.accommodation} onChange={(v) => set('accommodation', v)} />
                <RadioPills label="Food / canteen provided" name="food"
                  options={['Yes', 'No', 'Subsidised']} value={data.food}
                  onChange={(v) => set('food', v)} />
              </div>

              <RadioPills label="When do you need them" name="urgency" options={options.urgency}
                value={data.urgency} onChange={(v) => set('urgency', v)} />

              <Textarea label="Additional requirements" name="requirements" rows={4} maxLength={3000}
                value={data.requirements} onChange={(v) => set('requirements', v)}
                placeholder="Experience needed, documents required, working conditions, anything else we should know."
                error={errors.requirements} />

              <div className="rounded-xl border border-line bg-surface-soft p-4">
                <Checkbox name="consent" checked={data.consent}
                  onChange={(v) => set('consent', v)} error={errors.consent}>
                  I confirm that the details given above are correct, and I agree to be contacted by
                  phone and email about this requirement.
                </Checkbox>
              </div>

              {options.note && <p className="text-sm text-ink-muted">{options.note}</p>}
            </div>
          )}
        </StepPanel>

        <FormNav current={step} total={STEPS.length} onBack={back} onNext={() => void next()}
          submitting={submitting} submitLabel="Send requirement" />
      </form>
    </div>
  );
}
