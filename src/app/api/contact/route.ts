import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contactSchema, fieldErrors } from '@/lib/validation';
import { clientIp, rateLimit } from '@/lib/server-utils';
import { notifyNewMessage } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ip = await clientIp();

  const limit = rateLimit('contact', ip, 6, 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'You have sent several messages already. Please wait a little before sending another.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'The form could not be read. Please try again.' }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please check the highlighted fields.', fields: fieldErrors(parsed.error) },
      { status: 422 }
    );
  }

  const data = parsed.data;
  if (data.website_url) return NextResponse.json({ ok: true });

  try {
    db.run(
      `INSERT INTO messages (name, email, phone, subject, body, ip)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.name, data.email, data.phone ?? '', data.subject, data.body, ip]
    );

    void notifyNewMessage({
      name: data.name,
      email: data.email,
      phone: data.phone ?? '',
      subject: data.subject,
      body: data.body,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[contact]', err);
    return NextResponse.json(
      { error: 'We could not send your message just now. Please try again, or call us directly.' },
      { status: 500 }
    );
  }
}
