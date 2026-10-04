import { FlaskConical, Play, Plus, Square } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { EmptyState, ErrorNote, Spinner, btn, cx } from '../../components/ui';
import { ExperimentView, adminApi } from '../../lib/adminApi';
import { ExperimentForm, ExperimentFormErrors, buildExperimentPayload, mapExperimentIssues, pct, readoutTone, validateExperimentForm } from '../../lib/adminData';
import { ApiError, toApiError } from '../../lib/api';
import { Panel, SimulatedNote } from '../parts';
import { useAdminLoad } from '../useAdminLoad';

const EMPTY: ExperimentForm = { name: '', hypothesis: '', description: '', labelA: '', labelB: '', status: 'draft' };
const input = (bad: boolean) => cx('w-full rounded-xl border bg-ink px-4 py-2.5 text-sm outline-none transition focus:border-aqua', bad ? 'border-danger' : 'border-line');
const STATUS_STYLE = { draft: 'border-line text-muted', running: 'border-aqua/60 bg-aqua/10 text-aqua', completed: 'border-line bg-raised text-fg' };
const TONE = { simulated: 'border-saffron/50 bg-saffron/10', neutral: 'border-line bg-ink/60', positive: 'border-aqua/50 bg-aqua/10' };

export default function AdminExperiments() {
  const { data, error, loading, reload } = useAdminLoad(() => adminApi.experiments(), 'experiments');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ExperimentForm>(EMPTY);
  const [errors, setErrors] = useState<ExperimentFormErrors>({});
  const [formError, setFormError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const set = (k: keyof ExperimentForm) => (e: { target: { value: string } }) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  const create = async (e: FormEvent) => {
    e.preventDefault(); setFormError(null);
    const found = validateExperimentForm(form); setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try { await adminApi.createExperiment(buildExperimentPayload(form)); setForm(EMPTY); setShowForm(false); await reload(); }
    catch (err) { const a = toApiError(err); if (a.details.length) setErrors(mapExperimentIssues(a.details)); else setFormError(a); }
    finally { setSaving(false); }
  };

  const change = async (x: ExperimentView, status: 'running' | 'completed') => {
    if (status === 'completed' && !window.confirm(`Stop “${x.name}”? A stopped experiment cannot be restarted.`)) return;
    setBusyId(x.id); setActionError(null);
    try { await adminApi.setExperimentStatus(x.id, status); await reload(); }
    catch (err) { setActionError(toApiError(err).message); }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-extrabold tracking-tight">Experiments</h1><p className="mt-1 text-sm text-muted">A/B tests for the landing page. Results never pick a winner on simulated data.</p></div>
        <button className={btn.primary} onClick={() => setShowForm(!showForm)} aria-expanded={showForm}><Plus className="h-4 w-4" aria-hidden /> New experiment</button>
      </div>

      {showForm && (
        <Panel title="Create experiment" subtitle="Two variants, labelled A and B. Name it exactly “Registration CTA” and start it to drive the landing-page button wording.">
          <form onSubmit={create} noValidate className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label htmlFor="x-name" className="mb-1.5 block text-sm font-medium">Name</label><input id="x-name" className={input(!!errors.name)} value={form.name} onChange={set('name')} aria-invalid={!!errors.name} />{errors.name && <p role="alert" className="mt-1 text-xs text-danger">{errors.name}</p>}</div>
            <div className="sm:col-span-2"><label htmlFor="x-hyp" className="mb-1.5 block text-sm font-medium">Hypothesis</label><input id="x-hyp" className={input(!!errors.hypothesis)} value={form.hypothesis} onChange={set('hypothesis')} placeholder="e.g. A benefit-led label gets more students to register" />{errors.hypothesis && <p role="alert" className="mt-1 text-xs text-danger">{errors.hypothesis}</p>}</div>
            <div className="sm:col-span-2"><label htmlFor="x-desc" className="mb-1.5 block text-sm font-medium">Description (optional)</label><input id="x-desc" className={input(!!errors.description)} value={form.description} onChange={set('description')} /></div>
            <div><label htmlFor="x-a" className="mb-1.5 block text-sm font-medium">Variant A wording</label><input id="x-a" className={input(!!errors.labelA)} value={form.labelA} onChange={set('labelA')} placeholder="Register Now" aria-invalid={!!errors.labelA} />{errors.labelA && <p role="alert" className="mt-1 text-xs text-danger">{errors.labelA}</p>}</div>
            <div><label htmlFor="x-b" className="mb-1.5 block text-sm font-medium">Variant B wording</label><input id="x-b" className={input(!!errors.labelB)} value={form.labelB} onChange={set('labelB')} placeholder="Build My AI Project" aria-invalid={!!errors.labelB} />{errors.labelB && <p role="alert" className="mt-1 text-xs text-danger">{errors.labelB}</p>}</div>
            <div><label htmlFor="x-status" className="mb-1.5 block text-sm font-medium">Start as</label>
              <select id="x-status" className={input(false)} value={form.status} onChange={set('status')}><option value="draft">Draft (start later)</option><option value="running">Running now</option></select></div>
            <div className="flex items-end justify-end gap-2 sm:col-span-1"><button type="button" className={btn.ghost} onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className={btn.primary} disabled={saving}>{saving ? 'Creating…' : 'Create experiment'}</button></div>
            {formError && <div className="sm:col-span-2"><ErrorNote message={formError.message} /></div>}
          </form>
        </Panel>
      )}

      {actionError && <ErrorNote message={actionError} />}
      {loading && !data && <Spinner label="Loading experiments" />}
      {error && <ErrorNote message={error.message} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState title="No experiments yet" body="Create your first A/B test, or run the seed script to load the simulated demo experiments." />}

      {data?.map((x) => (
        <Panel key={x.id} title={x.name} subtitle={x.hypothesis || undefined}
          right={<div className="flex flex-wrap items-center gap-2"><span className={cx('rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize', STATUS_STYLE[x.status])}>{x.status}</span><SimulatedNote label={x.label} /></div>}>
          {x.description && <p className="-mt-2 mb-4 text-sm text-muted">{x.description}</p>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="text-xs text-muted"><tr><th className="py-2 font-medium">Variant</th><th className="py-2 font-medium">Wording</th><th className="py-2 text-right font-medium">Impressions</th><th className="py-2 text-right font-medium">Clicks</th><th className="py-2 text-right font-medium">Conversions</th><th className="py-2 text-right font-medium">Click rate</th><th className="py-2 text-right font-medium">Conv. rate</th></tr></thead>
              <tbody>{x.variants.map((v) => (
                <tr key={v.key} className="border-t border-line">
                  <td className="py-2.5 font-mono">{v.key}</td><td className="py-2.5">{v.label}</td>
                  <td className="py-2.5 text-right tabular-nums">{v.impressions}</td><td className="py-2.5 text-right tabular-nums">{v.clicks}</td><td className="py-2.5 text-right tabular-nums">{v.conversions}</td>
                  <td className="py-2.5 text-right tabular-nums">{pct(v.clickRate)}</td><td className="py-2.5 text-right tabular-nums">{pct(v.conversionRate)}</td>
                </tr>))}</tbody>
            </table>
          </div>
          {/* The server decides the verdict; for simulated data it is always "simulated" and names no leader. */}
          <p className={cx('mt-4 rounded-xl border px-4 py-3 text-sm', TONE[readoutTone(x.readout)])} role="note">{x.readout.message}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {x.isSimulated ? <p className="flex items-center gap-2 text-xs text-muted"><FlaskConical className="h-4 w-4" aria-hidden /> Seeded demo experiment: read-only, and it never receives live traffic.</p> : (
              <>
                {x.status === 'draft' && <button className={btn.small} disabled={busyId === x.id} onClick={() => change(x, 'running')}><Play className="h-4 w-4" aria-hidden /> Start</button>}
                {x.status === 'running' && <button className={btn.small} disabled={busyId === x.id} onClick={() => change(x, 'completed')}><Square className="h-4 w-4" aria-hidden /> Stop</button>}
                {x.status === 'completed' && <p className="text-xs text-muted">Stopped. Results are final.</p>}
              </>
            )}
          </div>
        </Panel>
      ))}
    </div>
  );
}
