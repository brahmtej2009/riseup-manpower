import { DetailList } from './ui';

/**
 * Renders the JSON submitted by a public form as a readable list.
 *
 * Anything the form gains later shows up automatically - an unknown key is
 * given a readable label rather than being hidden, so nothing a person typed
 * is ever silently lost.
 */

const LABELS: Record<string, string> = {
  company_name: 'Company name',
  industry: 'Industry',
  year_established: 'Year established',
  website: 'Website',
  gst_no: 'GST / registration number',
  contact_person: 'Contact person',
  designation: 'Designation',
  email: 'Email',
  phone: 'Phone',
  alt_phone: 'Alternate phone',
  address_line: 'Address',
  city: 'City',
  district: 'District',
  state: 'State',
  pincode: 'PIN code',
  manpower_types: 'Manpower required',
  workers_required: 'Number of workers',
  skill_level: 'Skill level',
  shift: 'Shift / duty',
  salary_range: 'Salary offered',
  work_location: 'Work location',
  accommodation: 'Accommodation',
  food: 'Food / canteen',
  urgency: 'Required by',
  requirements: 'Additional requirements',

  full_name: 'Full name',
  guardian_name: 'Father / husband name',
  dob: 'Date of birth',
  gender: 'Gender',
  qualification: 'Highest qualification',
  certification: 'ITI / diploma / certificate',
  job_category: 'Applying for',
  skills: 'Skills',
  experience_years: 'Years of experience',
  previous_employers: 'Previous employers',
  current_salary: 'Current salary',
  expected_salary: 'Expected salary',
  preferred_locations: 'Preferred locations',
  relocate: 'Willing to relocate',
  passport: 'Passport',
  driving_licence: 'Driving licence',
  languages: 'Languages',
  availability: 'Can join',
  notes: 'Notes from the applicant',
};

/** Fields that are already shown in the header of the detail page. */
const SKIP = new Set(['consent', 'website_url']);

const GROUPS: { title: string; keys: string[] }[] = [
  {
    title: 'Company',
    keys: ['company_name', 'industry', 'year_established', 'website', 'gst_no'],
  },
  {
    title: 'Personal details',
    keys: ['full_name', 'guardian_name', 'dob', 'gender'],
  },
  {
    title: 'Contact',
    keys: ['contact_person', 'designation', 'phone', 'alt_phone', 'email'],
  },
  {
    title: 'Address',
    keys: ['address_line', 'city', 'district', 'state', 'pincode'],
  },
  {
    title: 'Education & skills',
    keys: ['qualification', 'certification', 'job_category', 'skills', 'experience_years', 'previous_employers'],
  },
  {
    title: 'Requirement',
    keys: ['manpower_types', 'workers_required', 'skill_level', 'shift', 'salary_range',
           'work_location', 'accommodation', 'food', 'urgency'],
  },
  {
    title: 'Expectations',
    keys: ['current_salary', 'expected_salary', 'preferred_locations', 'relocate', 'passport',
           'driving_licence', 'languages', 'availability'],
  },
  {
    title: 'In their own words',
    keys: ['requirements', 'notes'],
  },
];

function humanise(key: string): string {
  return LABELS[key] ?? key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === '') return null;

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <span className="flex flex-wrap gap-1.5">
        {value.map((v, i) => (
          <span key={i} className="chip bg-slate-100 text-ink-soft ring-slate-200">
            {String(v)}
          </span>
        ))}
      </span>
    );
  }

  const text = String(value);
  // Long free text reads better as a paragraph than as a one-line value.
  if (text.length > 110) {
    return <span className="block whitespace-pre-wrap leading-relaxed">{text}</span>;
  }
  return text;
}

export function SubmittedData({ data }: { data: Record<string, unknown> }) {
  const used = new Set<string>();

  const groups = GROUPS.map((group) => {
    const items: [string, React.ReactNode][] = [];
    for (const key of group.keys) {
      if (SKIP.has(key) || !(key in data)) continue;
      const rendered = renderValue(data[key]);
      if (rendered === null) continue;
      used.add(key);
      items.push([humanise(key), rendered]);
    }
    return { title: group.title, items };
  }).filter((g) => g.items.length > 0);

  // Anything the groups above did not cover.
  const extras: [string, React.ReactNode][] = [];
  for (const [key, value] of Object.entries(data)) {
    if (SKIP.has(key) || used.has(key)) continue;
    const rendered = renderValue(value);
    if (rendered === null) continue;
    extras.push([humanise(key), rendered]);
  }
  if (extras.length) groups.push({ title: 'Other details', items: extras });

  if (groups.length === 0) {
    return <p className="text-sm text-ink-muted">No details were submitted.</p>;
  }

  return (
    <div className="space-y-7">
      {groups.map((group) => (
        <section key={group.title}>
          <h3 className="mb-3 border-b border-slate-100 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {group.title}
          </h3>
          <DetailList
            items={group.items}
            columns={group.title === 'In their own words' ? 1 : 2}
          />
        </section>
      ))}
    </div>
  );
}
