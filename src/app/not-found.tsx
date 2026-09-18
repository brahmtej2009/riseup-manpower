import Link from 'next/link';
import { Home, Search, ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-navy-900 px-5 py-16 text-white">
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgb(var(--navy-700)),rgb(var(--navy-950))_72%)]"
        aria-hidden
      />
      <div className="relative w-full max-w-lg text-center">
        <p className="font-display text-[clamp(4rem,14vw,7rem)] font-bold leading-none text-white/10">
          404
        </p>
        <h1 className="-mt-4 font-display text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
          This page does not exist
        </h1>
        <p className="mt-3 leading-relaxed text-slate-300">
          The link may be old, or the address may have been typed incorrectly. Everything on the site
          can be reached from the home page.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" data-sheen
            className="btn-primary">
            <Home className="h-4 w-4" />
            Go to the home page
          </Link>
          <Link href="/posts" className="btn border border-white/25 bg-white/[0.06] text-white hover:border-white hover:bg-white hover:text-navy-900">
            <Search className="h-4 w-4" />
            Browse posts
          </Link>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {[
            { href: '/register/employer', title: 'I need manpower', text: 'Send a requirement' },
            { href: '/register/candidate', title: 'I need a job', text: 'Register free' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-white/12 bg-white/[0.05] p-4 text-left transition hover:border-white/30 hover:bg-white/[0.1]"
            >
              <span>
                <span className="block text-sm font-semibold text-white">{item.title}</span>
                <span className="text-xs text-slate-400">{item.text}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-brand-400 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
