import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiUser, writeAudit } from '@/lib/auth';
import { toCsv, parseJson, formatDateTime } from '@/lib/utils';

/** Exports the submissions matching the current filters as a CSV file. */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await apiUser('submissions.export');
  if (!user) {
    return new NextResponse('Not allowed', { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const type = sp.get('type');
  const status = sp.get('status');
  const query = (sp.get('q') ?? '').trim();

  const where: string[] = [];
  const args: unknown[] = [];

  if (type === 'employer' || type === 'candidate') {
    where.push('type = ?');
    args.push(type);
  }
  if (status === 'pending') where.push("status IN ('new','reviewing')");
  else if (status && status !== 'all') {
    where.push('status = ?');
    args.push(status);
  }
  if (query) {
    where.push('(name LIKE ? OR email LIKE ? OR phone LIKE ? OR headline LIKE ? OR ref LIKE ?)');
    const like = `%${query}%`;
    args.push(like, like, like, like, like);
  }

  const rows = db.all<{
    ref: string; type: string; status: string; name: string; email: string; phone: string;
    city: string; state: string; headline: string; data: string; created_at: string;
  }>(
    `SELECT ref, type, status, name, email, phone, city, state, headline, data, created_at
       FROM submissions ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY id DESC LIMIT 10000`,
    args
  );

  const headers = [
    'Reference', 'Type', 'Status', 'Name', 'Company / Applying for', 'Phone', 'Alternate phone',
    'Email', 'City', 'District', 'State', 'PIN code', 'Industry / Qualification',
    'Experience / Workers needed', 'Skills / Manpower types', 'Salary', 'Availability / Urgency',
    'Notes', 'Received',
  ];

  const body = rows.map((r) => {
    const d = parseJson<Record<string, unknown>>(r.data, {});
    const join = (v: unknown) => (Array.isArray(v) ? v.join('; ') : (v ?? ''));

    return [
      r.ref,
      r.type === 'employer' ? 'Employer' : 'Candidate',
      r.status,
      r.name,
      r.headline,
      r.phone,
      String(d.alt_phone ?? ''),
      r.email,
      r.city,
      String(d.district ?? ''),
      r.state,
      String(d.pincode ?? ''),
      String(d.industry ?? d.qualification ?? ''),
      String(d.workers_required ?? d.experience_years ?? ''),
      String(join(d.manpower_types ?? d.skills)),
      String(d.salary_range ?? d.expected_salary ?? ''),
      String(d.urgency ?? d.availability ?? ''),
      String(d.requirements ?? d.notes ?? ''),
      formatDateTime(r.created_at),
    ];
  });

  await writeAudit(
    user.id,
    user.full_name || user.username,
    'submission.export',
    'submission',
    '',
    `${rows.length} row(s)`
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(headers, body), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="submissions-${type ?? 'all'}-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
