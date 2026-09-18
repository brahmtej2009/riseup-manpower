import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { employerSchema, fieldErrors } from '@/lib/validation';
import { clientIp, userAgent, rateLimit, nextRef } from '@/lib/server-utils';
import { notifyNewSubmission } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ip = await clientIp();
  const ua = await userAgent();

  // Five submissions per hour from one address is generous for a real
  // company and stops a script from filling the queue with rubbish.
  const limit = rateLimit('register_employer', ip, 5, 60);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error:
          'You have already sent several requirements from this connection. Please call us instead, or try again later.',
      },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'The form could not be read. Please try again.' }, { status: 400 });
  }

  const parsed = employerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Some details are missing or incorrect.', fields: fieldErrors(parsed.error) },
      { status: 422 }
    );
  }

  const data = parsed.data;

  // Honeypot: a person never sees this field, so anything in it is a bot.
  // Answer as though it worked, so the bot has nothing to learn from.
  if (data.website_url) {
    return NextResponse.json({ ok: true, reference: nextRef('submissions', 'EMP') });
  }

  try {
    const ref = nextRef('submissions', 'EMP');
    const { consent, website_url, ...payload } = data;
    void consent;
    void website_url;

    db.run(
      `INSERT INTO submissions
         (ref, type, status, name, email, phone, city, state, headline, data, ip, user_agent)
       VALUES (?, 'employer', 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ref,
        data.contact_person,
        data.email,
        data.phone,
        data.city,
        data.state,
        data.company_name,
        JSON.stringify(payload),
        ip,
        ua,
      ]
    );

    // The submission is already safe in the database; the email is a courtesy.
    void notifyNewSubmission({
      type: 'employer',
      ref,
      name: data.contact_person,
      headline: data.company_name,
      phone: data.phone,
      email: data.email,
      city: data.city,
      state: data.state,
    });

    return NextResponse.json({ ok: true, reference: ref });
  } catch (err) {
    console.error('[register/employer]', err);
    return NextResponse.json(
      { error: 'We could not save your details just now. Please try again, or call us directly.' },
      { status: 500 }
    );
  }
}
