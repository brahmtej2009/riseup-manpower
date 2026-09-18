import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { candidateSchema, fieldErrors } from '@/lib/validation';
import { clientIp, userAgent, rateLimit, nextRef } from '@/lib/server-utils';
import { storeDocument, storeImage } from '@/lib/uploads';
import { notifyNewSubmission } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ip = await clientIp();
  const ua = await userAgent();

  const limit = rateLimit('register_candidate', ip, 5, 60);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error:
          'Several registrations have already been sent from this connection. Please try again later, or visit the office.',
      },
      { status: 429 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'The form could not be read. Please try again.' }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get('payload') ?? '{}'));
  } catch {
    return NextResponse.json({ error: 'The form could not be read. Please try again.' }, { status: 400 });
  }

  const parsed = candidateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Some details are missing or incorrect.', fields: fieldErrors(parsed.error) },
      { status: 422 }
    );
  }

  const data = parsed.data;

  if (data.website_url) {
    return NextResponse.json({ ok: true, reference: nextRef('submissions', 'CAN') });
  }

  // Files are stored before the row is written, so a rejected file stops the
  // whole submission and the applicant is told why.
  let resumePath: string | null = null;
  let photoPath: string | null = null;

  try {
    const resume = form.get('resume');
    if (resume instanceof File && resume.size > 0) {
      resumePath = (await storeDocument(resume, null, 'resumes')).path;
    }

    const photo = form.get('photo');
    if (photo instanceof File && photo.size > 0) {
      photoPath = (await storeImage(photo, null, { square: true, maxSize: 600, folder: 'candidates' })).path;
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 });
  }

  try {
    const ref = nextRef('submissions', 'CAN');
    const { consent, website_url, ...payload } = data;
    void consent;
    void website_url;

    db.run(
      `INSERT INTO submissions
         (ref, type, status, name, email, phone, city, state, headline, data,
          resume_path, photo_path, ip, user_agent)
       VALUES (?, 'candidate', 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ref,
        data.full_name,
        data.email ?? '',
        data.phone,
        data.city,
        data.state,
        data.job_category,
        JSON.stringify(payload),
        resumePath,
        photoPath,
        ip,
        ua,
      ]
    );

    void notifyNewSubmission({
      type: 'candidate',
      ref,
      name: data.full_name,
      headline: data.job_category,
      phone: data.phone,
      email: data.email ?? '',
      city: data.city,
      state: data.state,
    });

    return NextResponse.json({ ok: true, reference: ref });
  } catch (err) {
    console.error('[register/candidate]', err);
    return NextResponse.json(
      { error: 'We could not save your details just now. Please try again, or call us directly.' },
      { status: 500 }
    );
  }
}
