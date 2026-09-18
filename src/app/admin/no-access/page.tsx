import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const metadata = { title: 'No access', robots: { index: false } };

export default function NoAccessPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-5">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-amber-700">
          <ShieldAlert className="h-7 w-7" />
        </span>
        <h1 className="font-display text-2xl font-bold text-ink">You do not have access to that</h1>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Your account does not have the permission needed for that screen. If you think it should,
          ask an administrator to tick it for you under Users &amp; permissions.
        </p>
        <Link href="/admin" className="btn-primary btn-sm mt-6">
          <ArrowLeft className="h-4 w-4" />
          Back to the dashboard
        </Link>
      </div>
    </div>
  );
}
