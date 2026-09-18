import 'server-only';
import { getSettings, str, num, bool, getSiteInfo } from './settings';
import { escapeHtml } from './sanitize';

/**
 * Email notifications for new submissions and messages.
 *
 * Every function here fails quietly. If the SMTP details are wrong or the mail
 * server is down, a visitor must still see their form succeed - the data is
 * already saved in the database, which is what actually matters. Failures are
 * logged to the server console.
 */

interface Mail {
  subject: string;
  html: string;
  text: string;
}

function smtpConfig() {
  const s = getSettings();
  if (!bool(s, 'mail_enabled', false)) return null;

  const host = str(s, 'mail_host');
  const to = str(s, 'mail_notify_to')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  if (!host || to.length === 0) return null;

  const port = num(s, 'mail_port', 587);
  return {
    host,
    port,
    secure: port === 465,
    auth: str(s, 'mail_user') ? { user: str(s, 'mail_user'), pass: str(s, 'mail_pass') } : undefined,
    from: str(s, 'mail_from') || str(s, 'mail_user') || `no-reply@${host}`,
    to,
  };
}

async function send(mail: Mail): Promise<boolean> {
  const config = smtpConfig();
  if (!config) return false;

  try {
    // Imported lazily so the package is only loaded when mail is switched on.
    const nodemailer = (await import('nodemailer')).default;
    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
    });

    await transport.sendMail({
      from: config.from,
      to: config.to.join(', '),
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    return true;
  } catch (err) {
    console.error('[mail] could not send notification:', (err as Error).message);
    return false;
  }
}

function wrap(title: string, rows: [string, string][], footer: string): Mail {
  const site = getSiteInfo();
  const base = process.env.NEXT_PUBLIC_SITE_URL || '';

  const tableRows = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;white-space:nowrap">${escapeHtml(
          k
        )}</td><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;color:#0b1220;font-size:14px">${escapeHtml(
          v
        )}</td></tr>`
    )
    .join('');

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f8fafc;padding:24px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
    <div style="background:#0b1220;padding:18px 22px">
      <p style="margin:0;color:#fff;font-size:16px;font-weight:600">${escapeHtml(site.name)}</p>
      <p style="margin:2px 0 0;color:#94a3b8;font-size:13px">${escapeHtml(title)}</p>
    </div>
    <table style="width:100%;border-collapse:collapse">${tableRows}</table>
    <div style="padding:16px 22px;background:#f8fafc">
      <p style="margin:0;color:#64748b;font-size:13px">${escapeHtml(footer)}</p>
      ${base ? `<a href="${base}/admin" style="display:inline-block;margin-top:10px;background:#1552f0;color:#fff;text-decoration:none;padding:9px 16px;border-radius:8px;font-size:13px;font-weight:600">Open the admin panel</a>` : ''}
    </div>
  </div>
</div>`;

  const text = [title, '', ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`), '', footer].join('\n');

  return { subject: `${site.name} - ${title}`, html, text };
}

export async function notifyNewSubmission(data: {
  type: 'employer' | 'candidate';
  ref: string;
  name: string;
  headline: string;
  phone: string;
  email: string;
  city: string;
  state: string;
}): Promise<void> {
  const label = data.type === 'employer' ? 'New employer enquiry' : 'New candidate registration';
  await send(
    wrap(
      label,
      [
        ['Reference', data.ref],
        [data.type === 'employer' ? 'Company' : 'Applying for', data.headline],
        ['Name', data.name],
        ['Phone', data.phone],
        ['Email', data.email],
        ['Location', [data.city, data.state].filter(Boolean).join(', ')],
      ],
      'Review and approve this in the admin panel under New submissions.'
    )
  );
}

export async function notifyNewMessage(data: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  body: string;
}): Promise<void> {
  await send(
    wrap(
      'New message from the website',
      [
        ['From', data.name],
        ['Email', data.email],
        ['Phone', data.phone],
        ['Subject', data.subject],
        ['Message', data.body.slice(0, 1500)],
      ],
      'Reply from the Messages section of the admin panel.'
    )
  );
}

/** Used by the Settings screen to check the SMTP details actually work. */
export async function sendTestEmail(): Promise<{ ok: boolean; error?: string }> {
  const config = smtpConfig();
  if (!config) {
    return { ok: false, error: 'Email is switched off, or the host and recipient are not filled in.' };
  }
  const sent = await send(
    wrap(
      'Test email',
      [['Status', 'If you are reading this, the email settings are working.']],
      'Sent from the Settings screen.'
    )
  );
  return sent ? { ok: true } : { ok: false, error: 'The mail server rejected the message. Check the host, port, username and password.' };
}
