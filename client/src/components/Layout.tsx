import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { cx } from './ui';

const links = [
  { to: '/', label: 'Workshop', end: true },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/dashboard', label: 'My referrals' },
];

export function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);
  const item = ({ isActive }: { isActive: boolean }) => cx('rounded-lg px-3 py-2 text-sm font-medium transition hover:text-fg', isActive ? 'text-fg' : 'text-muted');

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-saffron focus:px-4 focus:py-2 focus:text-ink">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span aria-hidden className="h-2.5 w-6 rounded-full bg-saffron" /> AI Workshop Growth Hub
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {links.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={item}>{l.label}</NavLink>)}
            <Link to="/register" className="ml-3 rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-ink hover:brightness-110">Register free</Link>
          </nav>
          <button className="rounded-lg p-2 md:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <nav aria-label="Mobile" className="flex flex-col gap-1 border-t border-line px-4 py-3 md:hidden">
            {links.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={item}>{l.label}</NavLink>)}
            <Link to="/register" className="mt-2 rounded-lg bg-saffron px-4 py-3 text-center text-sm font-semibold text-ink">Register free</Link>
          </nav>
        )}
      </header>
      <main id="main" className="flex-1"><Outlet /></main>
      <footer className="border-t border-line/70 py-8">
        <p className="mx-auto max-w-6xl px-4 text-xs leading-relaxed text-muted sm:px-6">
          This site is a simulated growth campaign built for an assessment. Any leaderboard or analytics numbers marked “Simulated campaign data” are demo records, not real results.
        </p>
      </footer>
    </div>
  );
}
