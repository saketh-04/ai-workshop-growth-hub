import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState, ErrorNote, Spinner, btn } from '../../components/ui';
import { Dataset, adminApi } from '../../lib/adminApi';
import { channelLabel, channelRows, funnelBars, pct, topChannel, trendRows } from '../../lib/adminData';
import { DatasetSwitch, Panel, SimulatedNote, Stat, axisTick, chartTooltip } from '../parts';
import { useAdminLoad } from '../useAdminLoad';

export default function AdminDashboard() {
  const [dataset, setDataset] = useState<Dataset>('all');
  const { data, error, loading, reload } = useAdminLoad(async () => {
    const [overview, channels, funnel, referrals] = await Promise.all([adminApi.overview(dataset), adminApi.channels(dataset), adminApi.funnel(dataset), adminApi.referrals(dataset)]);
    return { overview, channels, funnel, referrals };
  }, dataset);

  const label = data?.overview.meta.label;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Growth dashboard</h1>
          <p className="mt-1 text-sm text-muted">Target: 500 registrations in 7 days. All figures are computed from the database.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DatasetSwitch value={dataset} onChange={setDataset} />
          <button className={btn.small} onClick={reload} disabled={loading} aria-label="Refresh data"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden /> Refresh</button>
        </div>
      </div>
      {label && <div><SimulatedNote label={label} /><p className="mt-2 text-xs text-muted">The numbers below include seeded demo records. They illustrate the dashboard and are not real NxtWave results. Switch to “Real” to see only real registrations.</p></div>}

      {loading && !data && <Spinner label="Loading dashboard" />}
      {error && <ErrorNote message={error.message} onRetry={reload} />}

      {data && (() => {
        const { overview: o, channels, funnel, referrals } = data;
        const t = o.totals;
        const top = topChannel(channels);
        const last = o.daily[o.daily.length - 1];
        const rows = channelRows(channels);
        const bars = funnelBars(funnel.steps);
        const empty = t.registrations === 0;
        return (
          <div className={loading ? 'space-y-6 opacity-60 transition' : 'space-y-6 transition'} aria-busy={loading}>
            <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat label="Total registrations" value={String(t.registrations)} />
              <Stat label="Target" value={String(t.target)} hint={`${Math.max(0, t.target - t.registrations)} to go`} />
              <Stat label="Progress to target" value={`${t.progressPercent}%`} progress={t.progressPercent} />
              <Stat label="Referral registrations" value={String(t.referralRegistrations)} hint={`${pct(t.referralShare)} of registrations`} />
              <Stat label="Active referrers" value={String(t.activeReferrers)} hint="Students with 1+ credited referral" />
              <Stat label="Conversion rate" value={pct(t.visitorToRegistrationRate)} hint="Registrations ÷ landing views" />
              <Stat label="Top channel" value={top ? channelLabel(top.name) : '—'} hint={top ? `${top.registrations} registrations (${pct(top.share)})` : 'No registrations yet'} />
              <Stat label={`Campaign day ${last?.day ?? '—'}`} value={String(last?.registrations ?? 0)} hint={last ? `registrations on ${last.date}` : undefined} />
            </dl>

            {empty ? (
              <EmptyState title="No registrations in this dataset" body={dataset === 'real' ? 'No real students have registered yet. Switch to “Demo” or “All” to see the simulated campaign.' : 'Run the seed script to load the simulated campaign, or wait for real registrations.'} />
            ) : (
              <>
                <Panel title="7-day registrations" subtitle={`Day 1–Day 7 from ${o.campaign.startDate}. Bars: registrations per day. Line: referral registrations.`} right={<SimulatedNote label={label} />}>
                  <div className="h-72" role="img" aria-label="Daily registrations and referral registrations over the 7 campaign days">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={trendRows(o.daily)} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid stroke="#263256" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
                        <Tooltip {...chartTooltip} />
                        <Legend wrapperStyle={{ fontSize: 12, color: '#93a0c0' }} />
                        <Bar dataKey="registrations" name="Registrations" fill="#5ce1e6" radius={[6, 6, 0, 0]} />
                        <Line dataKey="referrals" name="Referral registrations" stroke="#ffb347" strokeWidth={2.5} dot={{ r: 3 }} type="monotone" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[28rem] text-left text-sm">
                      <thead className="text-xs text-muted"><tr><th className="py-2 font-medium">Day</th><th className="py-2 font-medium">Date</th><th className="py-2 text-right font-medium">Registrations</th><th className="py-2 text-right font-medium">Referral</th><th className="py-2 text-right font-medium">Cumulative</th></tr></thead>
                      <tbody>{o.daily.map((d) => <tr key={d.day} className="border-t border-line"><td className="py-2">Day {d.day}</td><td className="py-2 text-muted">{d.date}</td><td className="py-2 text-right tabular-nums">{d.registrations}</td><td className="py-2 text-right tabular-nums">{d.referralRegistrations}</td><td className="py-2 text-right tabular-nums">{d.cumulative}</td></tr>)}</tbody>
                    </table>
                  </div>
                </Panel>

                <div className="grid gap-6 xl:grid-cols-2">
                  <Panel title="Channel performance" subtitle="Registrations by channel. Conversion = registrations ÷ landing views, shown only where views were tracked." right={<SimulatedNote label={label} />}>
                    <div className="h-64" role="img" aria-label="Registrations by channel">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                          <CartesianGrid stroke="#263256" strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
                          <YAxis type="category" dataKey="label" width={100} tick={axisTick} tickLine={false} axisLine={false} />
                          <Tooltip {...chartTooltip} />
                          <Bar dataKey="registrations" name="Registrations" fill="#5ce1e6" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[26rem] text-left text-sm">
                        <thead className="text-xs text-muted"><tr><th className="py-2 font-medium">Channel</th><th className="py-2 text-right font-medium">Registrations</th><th className="py-2 text-right font-medium">Share</th><th className="py-2 text-right font-medium">Landing views</th><th className="py-2 text-right font-medium">Conversion</th></tr></thead>
                        <tbody>{rows.map((r) => <tr key={r.key} className="border-t border-line"><td className="py-2">{r.label}</td><td className="py-2 text-right tabular-nums">{r.registrations}</td><td className="py-2 text-right tabular-nums">{pct(r.share)}</td><td className="py-2 text-right tabular-nums text-muted">{r.landingViews ?? '—'}</td><td className="py-2 text-right tabular-nums">{r.conversionRate === null ? '—' : pct(r.conversionRate)}</td></tr>)}</tbody>
                      </table>
                    </div>
                    {channels.byCampaign.length > 0 && <p className="mt-3 text-xs text-muted">Campaigns: {channels.byCampaign.map((c) => `${c.name} (${c.registrations})`).join(', ')}</p>}
                  </Panel>

                  <Panel title="Registration funnel" subtitle="Bars are scaled to landing views." right={<SimulatedNote label={label} />}>
                    <ol className="space-y-4">
                      {bars.map((s) => (
                        <li key={s.key}>
                          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm"><span>{s.label}</span><span className="tabular-nums"><strong>{s.count}</strong>{s.rateFromPrevious !== null && <span className="ml-2 text-xs text-muted">{pct(s.rateFromPrevious)} of previous step</span>}</span></div>
                          <div className="h-3 overflow-hidden rounded-full bg-raised"><div className={`h-full rounded-full ${s.key === 'referral_registrations' ? 'bg-saffron' : 'bg-aqua'}`} style={{ width: `${s.widthPct}%` }} /></div>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-5 text-xs text-muted">Visitor → registration {pct(funnel.visitorToRegistration)} · Start → completion {pct(funnel.startToCompletion)}. The last step is the share of registrations that came through a credited referral, not a further drop-off.</p>
                  </Panel>
                </div>

                <Panel title="Referral performance" subtitle="Student names are masked." right={<SimulatedNote label={label} />}>
                  <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Stat label="Total link clicks" value={String(referrals.totalClicks)} />
                    <Stat label="Successful referrals" value={String(referrals.successfulReferrals)} />
                    <Stat label="Conversion rate" value={pct(referrals.conversionRate)} hint="Referrals ÷ clicks" />
                    <Stat label="Active referrers" value={String(referrals.activeReferrers)} />
                  </dl>
                  {referrals.topReferrers.length === 0 ? <p className="mt-5 text-sm text-muted">No referrals in this dataset yet.</p> : (
                    <div className="mt-6 grid gap-6 lg:grid-cols-2">
                      <div className="h-60" role="img" aria-label="Top referrers: referrals and link clicks">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={referrals.topReferrers} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid stroke="#263256" strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="displayName" tick={axisTick} tickLine={false} axisLine={false} interval={0} />
                            <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
                            <Tooltip {...chartTooltip} /><Legend wrapperStyle={{ fontSize: 12, color: '#93a0c0' }} />
                            <Bar dataKey="clicks" name="Link clicks" fill="#263256" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="referrals" name="Referrals" fill="#ffb347" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[22rem] text-left text-sm">
                          <thead className="text-xs text-muted"><tr><th className="py-2 font-medium">#</th><th className="py-2 font-medium">Student</th><th className="py-2 text-right font-medium">Referrals</th><th className="py-2 text-right font-medium">Clicks</th><th className="py-2 text-right font-medium">Conv.</th></tr></thead>
                          <tbody>{referrals.topReferrers.map((r) => <tr key={r.rank} className="border-t border-line"><td className="py-2 text-muted">{r.rank}</td><td className="py-2">{r.displayName}<span className="block text-xs text-muted">{r.college}</span></td><td className="py-2 text-right tabular-nums">{r.referrals}</td><td className="py-2 text-right tabular-nums">{r.clicks}</td><td className="py-2 text-right tabular-nums">{pct(r.conversionRate)}</td></tr>)}</tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </Panel>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}
