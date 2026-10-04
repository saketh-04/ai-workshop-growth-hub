import { ReactNode } from 'react';
import { SimulatedBadge, cx } from '../components/ui';
import type { Dataset } from '../lib/adminApi';

export function Panel({ title, subtitle, children, right }: { title: string; subtitle?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-semibold">{title}</h2>{subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}</div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, progress }: { label: string; value: string; hint?: string; progress?: number }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight">{value}</dd>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
          <div className="h-full rounded-full bg-saffron" style={{ width: `${progress}%` }} />
        </div>
      )}
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const OPTIONS: { value: Dataset; label: string }[] = [{ value: 'all', label: 'All' }, { value: 'real', label: 'Real' }, { value: 'demo', label: 'Demo' }];
export function DatasetSwitch({ value, onChange }: { value: Dataset; onChange: (d: Dataset) => void }) {
  return (
    <div role="radiogroup" aria-label="Dataset" className="inline-flex rounded-xl border border-line bg-ink p-1">
      {OPTIONS.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={cx('rounded-lg px-4 py-1.5 text-sm font-medium transition', value === o.value ? 'bg-raised text-fg' : 'text-muted hover:text-fg')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const SimulatedNote = ({ label }: { label: string | null | undefined }) => (label ? <SimulatedBadge label={label} /> : null);

export const chartTooltip = { contentStyle: { background: '#111933', border: '1px solid #263256', borderRadius: 12, color: '#e8ecf8', fontSize: 12 }, cursor: { fill: 'rgba(147,160,192,0.08)' } };
export const axisTick = { fill: '#93a0c0', fontSize: 12 };
