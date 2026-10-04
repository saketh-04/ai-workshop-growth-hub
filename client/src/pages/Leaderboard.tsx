import { Trophy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorNote, SimulatedBadge, Spinner, btn, cx } from '../components/ui';
import { ApiError, LeaderboardResponse, api, toApiError } from '../lib/api';

const podium = ['border-saffron bg-saffron/10', 'border-aqua/60 bg-aqua/10', 'border-muted/60 bg-raised'];

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await api.leaderboard()); } catch (e) { setError(toApiError(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight sm:text-4xl"><Trophy className="h-7 w-7 text-saffron" aria-hidden /> Referral leaderboard</h1>
      <p className="mt-2 text-muted">Ranked by friends who registered through each student's link.</p>
      {data?.meta.label && <div className="mt-4"><SimulatedBadge label={data.meta.label} /><p className="mt-2 text-xs text-muted">These rows are seeded demo records, not real students.</p></div>}

      <div className="mt-8">
        {loading && <Spinner label="Loading leaderboard" />}
        {error && !loading && <ErrorNote message={error.message} onRetry={load} />}
        {data && !loading && data.leaderboard.length === 0 && (
          <EmptyState title="No referrals yet" body="The leaderboard fills up as students bring friends. Register and share your link to take the first spot." action={<Link to="/register" className={btn.primary}>Register free</Link>} />
        )}
        {data && !loading && data.leaderboard.length > 0 && (
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Top referrers</caption>
            <thead className="text-xs text-muted"><tr><th className="w-16 py-3 font-medium">Rank</th><th className="py-3 font-medium">Student</th><th className="hidden py-3 font-medium sm:table-cell">College</th><th className="py-3 text-right font-medium">Referrals</th></tr></thead>
            <tbody>
              {data.leaderboard.map((e) => (
                <tr key={e.rank} className={cx('border-t border-line', e.rank <= 3 && 'font-semibold')}>
                  <td className="py-3.5"><span className={cx('inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm', e.rank <= 3 ? podium[e.rank - 1] : 'border-transparent text-muted')}>{e.rank}</span></td>
                  <td className="py-3.5">{e.displayName}<span className="block text-xs font-normal text-muted sm:hidden">{e.college}</span></td>
                  <td className="hidden py-3.5 text-muted sm:table-cell">{e.college}</td>
                  <td className="py-3.5 text-right tabular-nums">{e.successfulReferrals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
