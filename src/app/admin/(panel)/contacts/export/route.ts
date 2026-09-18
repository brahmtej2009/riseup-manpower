import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiUser, writeAudit } from '@/lib/auth';
import { toCsv, parseJson, formatDateTime } from '@/lib/utils';

/** Exports contacts matching the current filters as a CSV file. */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await apiUser('contacts.export');
  if (!user) return new NextResponse('Not allowed', { status: 403 });

  const sp = req.nextUrl.searchParams;
  const type = sp.get('type') === 'employer' ? 'employer' : 'candidate';
  const status = sp.get('status');
  const query = (sp.get('q') ?? '').trim();

  const where = ['type = ?'];
  const args: unknown[] = [type];

  if (status && status !== 'all') {
    where.push('status = ?');
    args.push(status);
  }
  if (query) {
    where.push('(name LIKE ? OR email LIKE ? OR phone LIKE ? OR headline LIKE ? OR ref LIKE ?)');
    const like = `%${query}%`;
    args.push(like, like, like, like, like);
  }

  const rows = db.all<{
    ref: string; status: string; name: string; email: string; phone: string; alt_phone: string;
    city: string; state: string; headline: string; data: string; tags: string;
    created_at: string; placed_at: string | null;
  }>(
    `SELECT ref, status, name, email, phone, alt_phone, city, state, headline, data, tags,
            created_at, placed_at
       FROM contacts WHERE ${where.join(' AND ')}
      ORDER BY id DESC LIMIT 10000`,
    args
  );

  const headers =
    type === 'employer'
      ? ['Reference', 'Company', 'Contact person', 'Designation', 'Phone', 'Alternate phone',
         'Email', 'Industry', 'City', 'District', 'State', 'PIN code', 'Manpower required',
         'Workers needed', 'Skill level', 'Salary offered', 'Required by', 'Status', 'Tags', 'Added']
      : ['Reference', 'Name', 'Applying for', 'Phone', 'Alternate phone', 'Email', 'Date of birth',
         'Gender', 'Qualification', 'Certification', 'Experience (years)', 'Skills', 'City',
         'District', 'State', 'PIN code', 'Expected salary', 'Preferred locations', 'Can join',
         'Status', 'Tags', 'Placed on', 'Added'];

  const body = rows.map((r) => {
    const d = parseJson<Record<string, unknown>>(r.data, {});
    const tags = parseJson<string[]>(r.tags, []).join('; ');
    const join = (v: unknown) => (Array.isArray(v) ? v.join('; ') : String(v ?? ''));
    const s = (k: string) => String(d[k] ?? '');

    return type === 'employer'
      ? [r.ref, r.headline, r.name, s('designation'), r.phone, r.alt_phone, r.email, s('industry'),
         r.city, s('district'), r.state, s('pincode'), join(d.manpower_types), s('workers_required'),
         s('skill_level'), s('salary_range'), s('urgency'), r.status, tags, formatDateTime(r.created_at)]
      : [r.ref, r.name, r.headline, r.phone, r.alt_phone, r.email, s('dob'), s('gender'),
         s('qualification'), s('certification'), s('experience_years'), join(d.skills), r.city,
         s('district'), r.state, s('pincode'), s('expected_salary'), join(d.preferred_locations),
         s('availability'), r.status, tags, r.placed_at ? formatDateTime(r.placed_at) : '',
         formatDateTime(r.created_at)];
  });

  await writeAudit(
    user.id,
    user.full_name || user.username,
    'contact.export',
    'contact',
    type,
    `${rows.length} row(s)`
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(headers, body), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${type}-contacts-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
