'use client';

import { useRef, useState } from 'react';
import { candidateSchema, fieldErrors } from '@/lib/validation';
import { trackEvent } from '@/components/site/Tracker';
import {
  Input, Textarea, Select, CheckboxGroup, RadioPills, Checkbox, Honeypot, FileField,
} from './fields';
import { StepProgress, StepPanel, FormNav, FormError, SuccessScreen, type Step } from './FormShell';

const STEPS: Step[] = [
  { id: 'personal', title: 'About you' },
  { id: 'contact', title: 'Contact' },
  { id: 'education', title: 'Education & work' },
  { id: 'preferences', title: 'Preferences' },
  { id: 'documents', title: 'Documents' },
];

const STEP_FIELDS: string[][] = [
  ['full_name', 'guardian_name', 'dob', 'gender'],
  ['phone', 'alt_phone', 'email', 'address_line', 'city', 'district', 'state', 'pincode'],
  ['qualification', 'certification', 'job_category', 'skills', 'experience_years', 'previous_employers'],
  ['current_salary', 'expected_salary', 'preferred_locations', 'relocate', 'passport',
   'driving_licence', 'languages', 'availability'],
  ['notes', 'consent'],
];

export interface CandidateOptions {
  states: string[];
  cities: string[];
  jobCategories: string[];
  qualifications: string[];
  availability: string[];
  languages: string[];
  note: string;
  successMessage: string;
}

const initial = {
  full_name: '', guardian_name: '', dob: '', gender: '',
  email: '', phone: '', alt_phone: '',
  address_line: '', city: '', district: '', state: '', pincode: '',
  qualification: '', certification: '',
  job_category: '', skills: [] as string[], experience_years: '', previous_employers: '',
  current_salary: '', expected_salary: '',
  preferred_locations: [] as string[], relocate: '', passport: '', driving_licence: '',
  languages: [] as string[], availability: '', notes: '',
  consent: false, website_url: '',
};

const COMMON_SKILLS = [
  'Machine operating', 'Welding', 'Electrical work', 'Plumbing', 'Driving', 'Loading and unloading',
  'Packing', 'Housekeeping', 'Cooking', 'Security duty', 'Computer / typing', 'Tally / accounts',
  'Store keeping', 'Supervision', 'Quality checking', 'Fitting', 'Masonry', 'Carpentry',
];

export function CandidateForm({ options }: { options: CandidateOptions }) {
  const [data, setData] = useState(initial);
  const [resume, setResume] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
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
      trackEvent('form.start', { category: 'form', label: 'candidate' });
    }
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => (e[key as string] ? { ...e, [key as string]: '' } : e));
  };

  const validateStep = (index: number): boolean => {
    const result = candidateSchema.safeParse(data);
    if (result.success) return true;
    const all = fieldErrors(result.error);
    const mine: Record<string, string> = {};
    for (const f of STEP_FIELDS[index]) if (all[f]) mine[f] = all[f];
    setErrors(mine);
    return Object.keys(mine).length === 0;
  };

  const scrollUp = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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
    const result = candidateSchema.safeParse(data);
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      setFormError('Some details are missing. Please check the highlighted fields.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      // Sent as FormData because a resume and a photograph may come with it.
      const fd = new FormData();
      fd.append('payload', JSON.stringify(result.data));
      if (resume) fd.append('resume', resume);
      if (photo) fd.append('photo', photo);

      const res = await fetch('/api/register/candidate', { method: 'POST', body: fd });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (body.fields) setErrors(body.fields);
        setFormError(body.error || 'Something went wrong. Please try again, or call us directly.');
        setSubmitting(false);
        return;
      }

      trackEvent('form.submit', { category: 'form', label: 'candidate' });
      setReference(body.reference);
    } catch {
      setFormError('We could not reach the server. Please check your connection and try again.');
      setSubmitting(false);
    }
  };

  if (reference) {
    return <SuccessScreen reference={reference} message={options.successMessage} type="candidate" />;
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
              <Input label="Full name" name="full_name" required className="sm:col-span-2"
                value={data.full_name} onChange={(v) => set('full_name', v)} error={errors.full_name}
                placeholder="As written on your Aadhaar card" autoComplete="name" />
              <Input label="Father's / husband's name" name="guardian_name"
                value={data.guardian_name} onChange={(v) => set('guardian_name', v)}
                error={errors.guardian_name} />
              <Input label="Date of birth" name="dob" type="date" value={data.dob}
                onChange={(v) => set('dob', v)} error={errors.dob}
                max={new Date().toISOString().slice(0, 10)} />
              <RadioPills label="Gender" name="gender" className="sm:col-span-2"
                options={['Male', 'Female', 'Other']} value={data.gender}
                onChange={(v) => set('gender', v)} />
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label="Phone number" name="phone" type="tel" required inputMode="tel"
                value={data.phone} onChange={(v) => set('phone', v)} error={errors.phone}
                placeholder="+91 00000 00000" autoComplete="tel"
                hint="We will call you on this number." />
              <Input label="Alternate phone" name="alt_phone" type="tel" inputMode="tel"
                value={data.alt_phone} onChange={(v) => set('alt_phone', v)} error={errors.alt_phone}
                placeholder="Optional" />
              <Input label="Email address" name="email" type="email" inputMode="email"
                className="sm:col-span-2" value={data.email ?? ''} onChange={(v) => set('email', v)}
                error={errors.email} placeholder="Optional" autoComplete="email" />
              <Input label="Address" name="address_line" className="sm:col-span-2"
                value={data.address_line} onChange={(v) => set('address_line', v)}
                error={errors.address_line} placeholder="House, street, area" />
              <Input label="City / town / village" name="city" required value={data.city}
                onChange={(v) => set('city', v)} error={errors.city} />
              <Input label="District" name="district" value={data.district}
                onChange={(v) => set('district', v)} error={errors.district} />
              <Select label="State" name="state" required options={options.states} value={data.state}
                onChange={(v) => set('state', v)} error={errors.state} />
              <Input label="PIN code" name="pincode" inputMode="numeric" maxLength={6}
                value={data.pincode} onChange={(v) => set('pincode', v)} error={errors.pincode} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <Select label="Highest qualification" name="qualification" required
                  options={options.qualifications} value={data.qualification}
                  onChange={(v) => set('qualification', v)} error={errors.qualification} />
                <Input label="ITI / diploma / certification" name="certification"
                  value={data.certification} onChange={(v) => set('certification', v)}
                  error={errors.certification} placeholder="e.g. ITI Electrician" />
                <Select label="What work are you looking for" name="job_category" required
                  className="sm:col-span-2" options={options.jobCategories} value={data.job_category}
                  onChange={(v) => set('job_category', v)} error={errors.job_category} />
              </div>

              <CheckboxGroup label="Your skills" name="skills" columns={3} options={COMMON_SKILLS}
                values={data.skills} onChange={(v) => set('skills', v)}
                hint="Select everything you can do. This helps us match you faster." />

              <div className="grid gap-5 sm:grid-cols-2">
                <Input label="Total years of experience" name="experience_years" inputMode="numeric"
                  maxLength={2} value={data.experience_years}
                  onChange={(v) => set('experience_years', v)} error={errors.experience_years}
                  placeholder="Enter 0 if you are a fresher" />
                <Input label="Previous employer(s)" name="previous_employers"
                  value={data.previous_employers} onChange={(v) => set('previous_employers', v)}
                  error={errors.previous_employers} placeholder="Company names, if any" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <Input label="Current salary" name="current_salary" value={data.current_salary}
                  onChange={(v) => set('current_salary', v)} placeholder="e.g. Rs. 15,000 per month" />
                <Input label="Expected salary" name="expected_salary" value={data.expected_salary}
                  onChange={(v) => set('expected_salary', v)} placeholder="e.g. Rs. 20,000 per month" />
              </div>

              <CheckboxGroup label="Preferred work locations" name="preferred_locations" columns={3}
                options={options.cities} values={data.preferred_locations}
                onChange={(v) => set('preferred_locations', v)} />

              <div className="grid gap-5 sm:grid-cols-2">
                <RadioPills label="Willing to relocate" name="relocate" options={['Yes', 'No']}
                  value={data.relocate} onChange={(v) => set('relocate', v)} />
                <RadioPills label="Do you have a passport" name="passport" options={['Yes', 'No']}
                  value={data.passport} onChange={(v) => set('passport', v)} />
                <RadioPills label="Driving licence" name="driving_licence"
                  options={['None', 'Two wheeler', 'LMV', 'HMV']} value={data.driving_licence}
                  onChange={(v) => set('driving_licence', v)} />
                <RadioPills label="When can you join" name="availability" options={options.availability}
                  value={data.availability} onChange={(v) => set('availability', v)} />
              </div>

              <CheckboxGroup label="Languages you know" name="languages" columns={3}
                options={options.languages} values={data.languages}
                onChange={(v) => set('languages', v)} />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <FileField label="Resume" name="resume" accept=".pdf,.doc,.docx" maxMb={8}
                  file={resume} onChange={setResume}
                  hint="PDF or Word. Optional, but it helps." />
                <FileField label="Photograph" name="photo" accept="image/*" maxMb={12}
                  file={photo} onChange={setPhoto}
                  hint="A clear passport-size photo." />
              </div>

              <Textarea label="Anything else we should know" name="notes" rows={4} maxLength={2000}
                value={data.notes} onChange={(v) => set('notes', v)} error={errors.notes}
                placeholder="Health conditions, shift preferences, family constraints, anything relevant." />

              <div className="rounded-xl border border-line bg-surface-soft p-4">
                <Checkbox name="consent" checked={data.consent} onChange={(v) => set('consent', v)}
                  error={errors.consent}>
                  I confirm that the details given above are true, and I agree to be contacted by phone
                  and email about job opportunities.
                </Checkbox>
              </div>

              {options.note && (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                  {options.note}
                </p>
              )}
            </div>
          )}
        </StepPanel>

        <FormNav current={step} total={STEPS.length} onBack={back} onNext={() => void next()}
          submitting={submitting} submitLabel="Submit registration" />
      </form>
    </div>
  );
}
