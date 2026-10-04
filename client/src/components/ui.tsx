import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { ReactNode } from 'react';

export const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

const base = 'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-60';
export const btn = {
  primary: cx(base, 'bg-saffron text-ink hover:brightness-110 active:brightness-95 shadow-[0_8px_30px_-12px_rgba(255,179,71,0.7)]'),
  ghost: cx(base, 'border border-line text-fg hover:border-muted hover:bg-panel'),
  small: 'inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium text-fg transition hover:border-muted hover:bg-panel',
};

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-muted">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> <span>{label}…</span>
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
      <div className="flex-1">
        <p className="text-fg">{message}</p>
        {onRetry && <button onClick={onRetry} className="mt-2 font-semibold text-saffron underline-offset-4 hover:underline">Try again</button>}
      </div>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line p-10 text-center">
      <Inbox className="mx-auto h-8 w-8 text-muted" aria-hidden />
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Used wherever seeded demo records can appear. */
export function SimulatedBadge({ label }: { label: string }) {
  return <span className="inline-flex items-center rounded-full border border-saffron/50 bg-saffron/10 px-3 py-1 text-xs font-semibold text-saffron">{label}</span>;
}
