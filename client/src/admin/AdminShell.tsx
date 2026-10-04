import { BarChart3, ExternalLink, FlaskConical, LogOut, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cx } from '../components/ui';
import { clearToken, getToken } from '../lib/adminAuth';

const nav = [{ to: '/admin', label: 'Dashboard', icon: BarChart3, end: true }, { to: '/admin/experiments', label: 'Experiments', icon: FlaskConical }];

/** Route guard + responsive shell: fixed sidebar on large screens, slide-down menu on phones and tablets. */
export default function AdminShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  if (!getToken()) return <Navigate to="/admin/login" replace state={{ from: pathname }} />;

  const logout = () => { clearToken(); navigate('/admin/login', { replace: true }); };
  const link = ({ isActive }: { isActive: boolean }) => cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-raised text-fg' : 'text-muted hover:bg-panel hover:text-fg');
  const items = (
    <>
      {nav.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={link}><Icon className="h-4 w-4" aria-hidden /> {label}</NavLink>)}
      <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-panel hover:text-fg"><ExternalLink className="h-4 w-4" aria-hidden /> View public site</Link>
      <button onClick={logout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-muted hover:bg-panel hover:text-fg"><LogOut className="h-4 w-4" aria-hidden /> Sign out</button>
    </>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="hidden border-r border-line/70 bg-ink lg:block">
        <div className="sticky top-0 flex h-screen flex-col gap-1 p-4">
          <p className="mb-4 flex items-center gap-2 px-3 font-bold"><span aria-hidden className="h-2.5 w-6 rounded-full bg-saffron" /> Growth console</p>
          <nav aria-label="Admin" className="flex flex-1 flex-col gap-1">{items}</nav>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/90 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <p className="flex items-center gap-2 font-bold"><span aria-hidden className="h-2.5 w-6 rounded-full bg-saffron" /> Growth console</p>
            <button className="rounded-lg p-2" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
          {open && <nav aria-label="Admin mobile" className="flex flex-col gap-1 border-t border-line px-3 py-3">{items}</nav>}
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10"><Outlet /></main>
      </div>
    </div>
  );
}
