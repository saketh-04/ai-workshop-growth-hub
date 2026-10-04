import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShareButtons } from '../components/ShareButtons';
import { EmptyState, ErrorNote, Spinner, btn } from '../components/ui';
import { ApiError, ReferralStats, api, toApiError } from '../lib/api';
import { referralLink } from '../lib/share';
import { getStudent } from '../lib/student';

const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

export default function Dashboard() {
  const { code: param } = useParams();
  const navigate = useNavigate();
  const code = (param ?? getStudent()?.referralCode ?? '').toUpperCase();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(!!code);
  const [lookup, setLookup] = useState('');

  const load = useCallback(async () => {
    if (!code) return;
    setLoading(true); setError(null);
    try { setStats(await api.referralStats(code)); } catch (e) { setError(toApiError(e)); setStats(null); } finally { setLoading(false); }
  }, [code]);
  useEffect(() => { void load(); }, [load]);

  const find = (e: FormEvent) => { e.preventDefault(); if (lookup.trim()) navigate(`/dashboard/${lookup.trim().toUpperCase()}`); };

  if (!code) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title="Open your referral dashboard" body="Enter the referral code you received when you registered, or register to get one."
          action={<Link to="/register" className={btn.primary}>Register free</Link>} />
        <form onSubmit={find} className="mt-6 flex gap-2">
          <label htmlFor="lookup" className="sr-only">Referral code</label>
          <input id="lookup" value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="e.g. SAKETH7X4" className="w-full rounded-xl border border-line bg-ink px-4 py-3 font-mono text-sm uppercase outline-none focus:border-aqua" />
          <button className={btn.ghost}>Open</button>
        </form>
      </div>
    );
  }
  const link = referralLink(window.location.origin, code);
  const cards = stats && [
    ['Link clicks', String(stats.clicks)], ['Successful referrals', String(stats.successfulReferrals)],
    ['Conversion rate', pct(stats.conversionRate)], ['Leaderboard rank', stats.rank ? `#${stats.rank}` : '—'],
  ];
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Your referrals</h1>
      <p className="mt-1 text-muted">Code <span className="font-mono text-saffron">{code}</span></p>
      {loading && <Spinner label="Loading your stats" />}
      {error && !loading && (error.status === 404
        ? <div className="mt-8"><EmptyState title="We couldn't find that code" body="Check the code and try again." action={<Link to="/dashboard" className={btn.ghost} onClick={() => navigate('/dashboard')}>Try another code</Link>} /></div>
        : <div className="mt-8"><ErrorNote message={error.message} onRetry={load} /></div>)}
      {stats && !loading && (
        <>
          <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {cards!.map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-line bg-panel p-5"><dt className="text-xs text-muted">{k}</dt><dd className="mt-2 text-3xl font-extrabold tabular-nums">{v}</dd></div>
            ))}
          </dl>
          {stats.successfulReferrals === 0 && <p className="mt-4 text-sm text-muted">No referrals yet. Share your link and your first friend will show up here.</p>}
          <div className="mt-8 rounded-2xl border border-line bg-panel p-6">
            <h2 className="font-semibold">Share your link</h2>
            <p className="mt-3 break-all rounded-lg border border-line bg-ink px-3 py-2 font-mono text-xs">{link}</p>
            <div className="mt-4"><ShareButtons link={link} /></div>
          </div>
          <Link to="/leaderboard" className="mt-6 inline-block text-sm font-semibold text-saffron underline-offset-4 hover:underline">See the leaderboard</Link>
        </>
      )}
    </div>
  );
}
