import { z } from 'zod';

/**
 * Validation for the two public registration forms and the contact form.
 * The same schemas run in the browser (for instant feedback) and again on the
 * server, which is the only place the result is trusted.
 */

const trimmed = (max: number) => z.string().trim().max(max);

const phone = z
  .string()
  .trim()
  .min(10, 'Enter a valid phone number')
  .max(20, 'Enter a valid phone number')
  .refine((v) => (v.replace(/\D/g, '').length >= 10), 'Enter a valid phone number');

const optionalPhone = z
  .string()
  .trim()
  .max(20)
  .refine((v) => v === '' || v.replace(/\D/g, '').length >= 10, 'Enter a valid phone number')
  .optional()
  .or(z.literal(''));

const email = z.string().trim().email('Enter a valid email address').max(160);
const optionalEmail = z
  .union([z.literal(''), z.string().trim().email('Enter a valid email address').max(160)])
  .optional();

const pincode = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d{6}$/.test(v), 'PIN code must be 6 digits')
  .optional()
  .or(z.literal(''));

/**
 * Honeypot: a field hidden from people but filled in by most bots.
 *
 * It deliberately accepts any value. The check happens in the route handler,
 * which answers as though the submission succeeded and quietly discards it -
 * so a bot learns nothing, and a browser that autofills the hidden field
 * never shows the visitor an error about a field they cannot see.
 */
export const honeypot = z.string().max(300).optional();

// ---------------------------------------------------------------------------
// Employer registration
// ---------------------------------------------------------------------------

export const employerSchema = z.object({
  company_name: trimmed(160).min(2, 'Enter the company name'),
  industry: trimmed(80).min(1, 'Select the industry'),
  year_established: trimmed(4).optional().or(z.literal('')),
  website: trimmed(200).optional().or(z.literal('')),
  gst_no: trimmed(40).optional().or(z.literal('')),

  contact_person: trimmed(120).min(2, 'Enter the contact person’s name'),
  designation: trimmed(80).optional().or(z.literal('')),
  email,
  phone,
  alt_phone: optionalPhone,

  address_line: trimmed(250).optional().or(z.literal('')),
  city: trimmed(80).min(2, 'Enter the city'),
  district: trimmed(80).optional().or(z.literal('')),
  state: trimmed(80).min(2, 'Select the state'),
  pincode,

  manpower_types: z.array(z.string().max(80)).min(1, 'Select at least one type of manpower'),
  workers_required: trimmed(10).min(1, 'Enter how many workers you need'),
  skill_level: trimmed(60).optional().or(z.literal('')),
  shift: trimmed(60).optional().or(z.literal('')),
  salary_range: trimmed(80).optional().or(z.literal('')),
  work_location: trimmed(160).optional().or(z.literal('')),
  accommodation: trimmed(40).optional().or(z.literal('')),
  food: trimmed(60).optional().or(z.literal('')),
  urgency: trimmed(60).optional().or(z.literal('')),
  requirements: trimmed(3000).optional().or(z.literal('')),

  consent: z.literal(true, { errorMap: () => ({ message: 'Please confirm before submitting' }) }),
  website_url: honeypot,
});

export type EmployerForm = z.infer<typeof employerSchema>;

// ---------------------------------------------------------------------------
// Candidate registration
// ---------------------------------------------------------------------------

export const candidateSchema = z.object({
  full_name: trimmed(120).min(2, 'Enter your full name'),
  guardian_name: trimmed(120).optional().or(z.literal('')),
  dob: trimmed(10).optional().or(z.literal('')),
  gender: trimmed(20).optional().or(z.literal('')),

  email: optionalEmail,
  phone,
  alt_phone: optionalPhone,

  address_line: trimmed(250).optional().or(z.literal('')),
  city: trimmed(80).min(2, 'Enter your city'),
  district: trimmed(80).optional().or(z.literal('')),
  state: trimmed(80).min(2, 'Select your state'),
  pincode,

  qualification: trimmed(80).min(1, 'Select your qualification'),
  certification: trimmed(160).optional().or(z.literal('')),

  job_category: trimmed(80).min(1, 'Select the kind of work you are looking for'),
  skills: z.array(z.string().max(60)).max(20).optional(),
  experience_years: trimmed(3).optional().or(z.literal('')),
  previous_employers: trimmed(300).optional().or(z.literal('')),
  current_salary: trimmed(40).optional().or(z.literal('')),
  expected_salary: trimmed(40).optional().or(z.literal('')),

  preferred_locations: z.array(z.string().max(80)).max(10).optional(),
  relocate: trimmed(10).optional().or(z.literal('')),
  passport: trimmed(10).optional().or(z.literal('')),
  driving_licence: trimmed(40).optional().or(z.literal('')),
  languages: z.array(z.string().max(40)).max(15).optional(),
  availability: trimmed(60).optional().or(z.literal('')),
  notes: trimmed(2000).optional().or(z.literal('')),

  consent: z.literal(true, { errorMap: () => ({ message: 'Please confirm before submitting' }) }),
  website_url: honeypot,
});

export type CandidateForm = z.infer<typeof candidateSchema>;

// ---------------------------------------------------------------------------
// Contact form
// ---------------------------------------------------------------------------

export const contactSchema = z.object({
  name: trimmed(120).min(2, 'Enter your name'),
  email,
  phone: optionalPhone,
  subject: trimmed(160).min(2, 'Enter a subject'),
  body: trimmed(4000).min(10, 'Please write a little more'),
  website_url: honeypot,
});

export type ContactForm = z.infer<typeof contactSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Turns a ZodError into { field: message } for rendering next to inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Reads a FormData into a plain object, collecting repeated keys as arrays. */
export function formDataToObject(fd: FormData, arrayKeys: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(fd.keys())) {
    const values = fd.getAll(key).filter((v) => typeof v === 'string') as string[];
    if (arrayKeys.includes(key)) out[key] = values;
    else out[key] = values[values.length - 1] ?? '';
  }
  for (const key of arrayKeys) if (!(key in out)) out[key] = [];
  if ('consent' in out) out.consent = out.consent === 'on' || out.consent === 'true';
  return out;
}

export const EMPLOYER_ARRAY_FIELDS = ['manpower_types'];
export const CANDIDATE_ARRAY_FIELDS = ['skills', 'preferred_locations', 'languages'];
