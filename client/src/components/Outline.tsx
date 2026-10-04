import { motion, useReducedMotion } from 'framer-motion';

export interface OutlineStep { minutes: number; step: string }
/** The 60-minute plan as a proportional bar plus a readable list. Used for the workshop and for AI suggestions. */
export function Outline({ steps, compact = false }: { steps: OutlineStep[]; compact?: boolean }) {
  const reduce = useReducedMotion();
  const total = steps.reduce((s, x) => s + x.minutes, 0);
  let start = 0;
  return (
    <div>
      <div className="flex h-3 w-full gap-1 overflow-hidden rounded-full" role="img" aria-label={`${total}-minute plan in ${steps.length} steps`}>
        {steps.map((s, i) => (
          <motion.div
            key={i}
            style={{ width: `${(s.minutes / total) * 100}%`, originX: 0 }}
            className={i === steps.length - 1 ? 'bg-saffron' : 'bg-aqua'}
            initial={reduce ? false : { scaleX: 0, opacity: 0.4 }}
            animate={{ scaleX: 1, opacity: 1 - (steps.length - 1 - i) * 0.12 }}
            transition={{ delay: 0.15 + i * 0.12, duration: 0.5, ease: 'easeOut' }}
          />
        ))}
      </div>
      {!compact && (
        <ol className="mt-5 space-y-3">
          {steps.map((s) => {
            const from = start;
            start += s.minutes;
            return (
              <li key={s.step} className="grid grid-cols-[6.5rem_1fr] gap-4 text-sm">
                <span className="font-mono text-muted">{from}–{start} min</span>
                <span>{s.step}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export const WORKSHOP_STEPS: OutlineStep[] = [
  { minutes: 5, step: 'Define the user and the one problem you are solving' },
  { minutes: 10, step: 'Set up the project and connect to an LLM API' },
  { minutes: 20, step: 'Build the core feature that makes your idea work' },
  { minutes: 15, step: 'Add a simple interface so anyone can try it' },
  { minutes: 10, step: 'Test with real examples and get it ready to share' },
];
