'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Send } from 'lucide-react';
import { contactSchema, fieldErrors } from '@/lib/validation';
import { trackEvent } from '@/components/site/Tracker';
import { Input, Textarea, Honeypot } from './fields';
import { FormError } from './FormShell';

const initial = { name: '', email: '', phone: '', subject: '', body: '', website_url: '' };

export function ContactForm() {
  const [data, setData] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [sent, setSent] = useState(false);
  const started = useRef(false);

  const set = (key: keyof typeof initial, value: string) => {
    if (!started.current) {
      started.current = true;
      trackEvent('form.start', { category: 'form', label: 'contact' });
    }
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = contactSchema.safeParse(data);
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (body.fields) setErrors(body.fields);
        setFormError(body.error || 'Your message could not be sent. Please try again.');
        setSubmitting(false);
        return;
      }

      trackEvent('form.submit', { category: 'form', label: 'contact' });
      setSent(true);
    } catch {
      setFormError('We could not reach the server. Please check your connection and try again.');
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <motion.div
        className="card p-8 text-center sm:p-10"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="h-7 w-7" strokeWidth={3} />
        </span>
        <h2 className="font-display text-xl font-bold">Message sent</h2>
        <p className="mt-2.5 leading-relaxed text-ink-soft">
          Thank you for writing to us. We will reply to the email address you gave, usually within one
          working day.
        </p>
        <button
          type="button"
          onClick={() => {
            setData(initial);
            setSent(false);
            setSubmitting(false);
          }}
          className="btn-outline btn-sm mt-6"
        >
          Send another message
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="card p-6 sm:p-8">
      <h2 className="mb-1 font-display text-xl font-bold">Send us a message</h2>
      <p className="mb-6 text-sm text-ink-soft">
        Fill this in and we will get back to you. For an urgent requirement, please call instead.
      </p>

      <FormError message={formError} />
      <Honeypot value={data.website_url} onChange={(v) => set('website_url', v)} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Your name" name="name" required value={data.name}
          onChange={(v) => set('name', v)} error={errors.name} autoComplete="name" />
        <Input label="Phone number" name="phone" type="tel" inputMode="tel" value={data.phone}
          onChange={(v) => set('phone', v)} error={errors.phone} placeholder="Optional"
          autoComplete="tel" />
        <Input label="Email address" name="email" type="email" required inputMode="email"
          className="sm:col-span-2" value={data.email} onChange={(v) => set('email', v)}
          error={errors.email} autoComplete="email" />
        <Input label="Subject" name="subject" required className="sm:col-span-2"
          value={data.subject} onChange={(v) => set('subject', v)} error={errors.subject}
          placeholder="What is this about?" />
        <Textarea label="Message" name="body" required rows={6} maxLength={4000}
          className="sm:col-span-2" value={data.body} onChange={(v) => set('body', v)}
          error={errors.body} placeholder="Tell us what you need." />
      </div>

      <button type="submit" disabled={submitting} className="btn-primary mt-7 w-full sm:w-auto">
        {submitting ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Sending…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Send message
          </>
        )}
      </button>
    </form>
  );
}
