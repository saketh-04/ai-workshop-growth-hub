/**
 * Render smoke tests: each page is server-rendered inside a router and checked for its key content.
 * This proves the pages mount without throwing and contain the required copy. It does NOT test layout,
 * styling, click behaviour or browser-only effects (no browser is available in the authoring sandbox).
 */
import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../src/App';
import AdminShell from '../src/admin/AdminShell';
import AdminDashboard from '../src/admin/pages/AdminDashboard';
import AdminExperiments from '../src/admin/pages/AdminExperiments';
import AdminLogin from '../src/admin/pages/AdminLogin';
import { Outline, WORKSHOP_STEPS } from '../src/components/Outline';

const html = (path: string) => renderToString(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const text = (h: string) => h.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, ' ');

describe('pages render', () => {
  it('landing: headline, support line, both CTAs, every required section, FAQ, simulation disclaimer', () => {
    const t = text(html('/'));
    for (const s of [
      'Build Your First AI Project in 60 Minutes', "Go from idea to a working AI project — even if you've never built one before.",
      'Reserve My Spot', "See what you'll build", 'Why this workshop?', "What you'll build", "Who it's for", 'The 60-minute timeline',
      'Tools you can use', 'Benefits for final-year students', 'Bring your friends', 'Questions', 'simulated growth campaign',
    ]) expect(t, s).toContain(s);
  });
  it('landing makes no fake statistics or testimonials', () => {
    const t = text(html('/')).toLowerCase();
    for (const bad of ['testimonial', '10,000', 'students trained', '★']) expect(t).not.toContain(bad);
  });
  it('register: all required fields with accessible labels and the default CTA', () => {
    const h = html('/register');
    for (const l of ['Full name', 'Email', 'College', 'Branch', 'Graduation year', 'Phone (optional)', 'How did you hear about us?']) expect(text(h)).toContain(l);
    for (const id of ['name', 'email', 'college', 'branch', 'graduationYear', 'phone', 'source']) expect(h).toContain(`id="${id}"`);
    for (const s of ['WhatsApp', 'College club', 'LinkedIn', 'Instagram', 'A friend (referral)', 'Other']) expect(text(h)).toContain(s);
    expect(text(h)).toContain('Reserve My Spot');
  });
  it('welcome without a saved registration shows an empty state, not a crash', () => expect(text(html('/welcome'))).toContain('No registration found on this device'));
  it('dashboard without a code shows the lookup empty state', () => {
    const t = text(html('/dashboard'));
    expect(t).toContain('Open your referral dashboard');
    expect(html('/dashboard')).toContain('id="lookup"');
  });
  it('leaderboard starts in a loading state', () => expect(text(html('/leaderboard'))).toContain('Loading leaderboard'));
  it('unknown route -> not found', () => expect(text(html('/nope'))).toContain('Page not found'));
  it('nav links to every public page', () => {
    const h = html('/');
    for (const href of ['/leaderboard', '/dashboard', '/register']) expect(h).toContain(`href="${href}"`);
  });
});

describe('Outline', () => {
  it('the workshop plan is exactly 60 minutes', () => expect(WORKSHOP_STEPS.reduce((s, x) => s + x.minutes, 0)).toBe(60));
  it('lists cumulative minute ranges', () => {
    const t = text(renderToString(<Outline steps={WORKSHOP_STEPS} />));
    for (const r of ['0–5 min', '5–15 min', '15–35 min', '35–50 min', '50–60 min']) expect(t).toContain(r);
  });
  it('compact mode renders only the bar', () => expect(renderToString(<Outline steps={WORKSHOP_STEPS} compact />)).not.toContain('<ol'));
});

describe('admin pages render', () => {
  const at = (el: ReactElement) => renderToString(<MemoryRouter>{el}</MemoryRouter>);
  it('login: labelled email + password fields and a sign-in button', () => {
    const h = at(<AdminLogin />);
    for (const s of ['Admin sign in', 'Email', 'Password', 'Sign in']) expect(text(h)).toContain(s);
    expect(h).toContain('id="admin-email"'); expect(h).toContain('type="password"');
  });
  it('route guard: with no token the admin area renders NOTHING (no shell, no protected content)', () => {
    const h = renderToString(
      <MemoryRouter initialEntries={['/admin']}><Routes><Route path="/admin" element={<AdminShell />}><Route index element={<div>SECRET-DASHBOARD</div>} /></Route></Routes></MemoryRouter>,
    );
    expect(text(h)).not.toContain('SECRET-DASHBOARD');
    expect(text(h)).not.toContain('Growth console');
  });
  it('dashboard and experiments start in a loading state (no data, no crash)', () => {
    expect(text(at(<AdminDashboard />))).toContain('Growth dashboard');
    expect(text(at(<AdminDashboard />))).toContain('Loading dashboard');
    expect(text(at(<AdminExperiments />))).toContain('Loading experiments');
  });
  it('dashboard shows the dataset switcher with All / Real / Demo', () => {
    const t = text(at(<AdminDashboard />));
    for (const s of ['All', 'Real', 'Demo']) expect(t).toContain(s);
  });
});
