import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Gift, Laptop, Rocket, Sparkles, Target, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Outline, WORKSHOP_STEPS } from '../components/Outline';
import { btn } from '../components/ui';
import { useCta } from '../lib/useCta';

const faqs = [
  ['Is the workshop really free?', 'Yes. Registration is free.'],
  ['I have never built an AI project. Is this for me?', 'Yes. The workshop is designed for beginners, and every project fits in 60 minutes.'],
  ['What do I need?', 'A laptop and an internet connection.'],
  ['Who can register?', 'Final-year engineering students from any branch.'],
  ['How does the referral leaderboard work?', 'Every student gets a personal link after registering. When a friend registers through it, you are credited and move up the leaderboard.'],
];

export default function Landing() {
  const cta = useCta(true);
  const reduce = useReducedMotion();
  const fade = reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } };
  const CtaLink = ({ className }: { className: string }) => (
    <Link to="/register" onClick={cta.onClick} className={className}>{cta.label} <ArrowRight className="h-4 w-4" aria-hidden /></Link>
  );

  return (
    <>
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_top,rgba(92,225,230,0.12),transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <motion.div {...fade} className="max-w-3xl">
            <p className="text-sm font-semibold text-aqua">Free workshop for final-year engineering students</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">Build Your First AI Project in 60 Minutes</h1>
            <p className="mt-5 max-w-xl text-lg text-muted">Go from idea to a working AI project — even if you've never built one before.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CtaLink className={btn.primary} />
              <a href="#build" className={btn.ghost}>See what you'll build</a>
            </div>
          </motion.div>
          <div className="mt-14 max-w-3xl rounded-2xl border border-line bg-panel/70 p-5 sm:p-6">
            <div className="mb-4 flex items-baseline justify-between text-sm"><span className="font-semibold">Your 60 minutes</span><span className="font-mono text-muted">0 → 60 min</span></div>
            <Outline steps={WORKSHOP_STEPS} compact />
            <div className="mt-3 flex justify-between text-xs text-muted"><span>Idea</span><span>Ship</span></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">Why this workshop?</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            [Rocket, 'You finish with something real', 'One small AI project you built yourself, not a slide deck about AI.'],
            [Sparkles, 'Starts from zero', 'No prior AI experience needed. You follow a plan, step by step, with a clear stopping point.'],
            [Target, 'Made for your final year', 'A project you can show in interviews and talk about with confidence.'],
          ].map(([Icon, title, body]) => {
            const I = Icon as typeof Rocket;
            return (
              <div key={title as string} className="rounded-2xl border border-line p-6">
                <I className="h-6 w-6 text-saffron" aria-hidden />
                <h3 className="mt-4 font-semibold">{title as string}</h3>
                <p className="mt-2 text-sm text-muted">{body as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="build" className="border-y border-line/70 bg-panel/40">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">What you'll build</h2>
            <p className="mt-3 max-w-md text-muted">Pick an area you care about. After you register we suggest a project for it, with the exact steps for the hour.</p>
            <ul className="mt-6 grid max-w-md grid-cols-2 gap-3 text-sm">
              {['Productivity', 'Education', 'Healthcare', 'Finance', 'Career', 'Something else'].map((c) => <li key={c} className="rounded-lg border border-line px-4 py-3">{c}</li>)}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">The 60-minute timeline</h2>
            <div className="mt-6"><Outline steps={WORKSHOP_STEPS} /></div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">Who it's for</h2>
          <ul className="mt-5 space-y-3 text-muted">
            <li>Final-year engineering students from any branch.</li>
            <li>Beginners who want a first hands-on AI project.</li>
            <li>Students who want a project to show during placements.</li>
          </ul>
        </div>
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">Tools you can use</h2>
          <p className="mt-3 text-sm text-muted">Examples of what a beginner-friendly stack looks like. You are free to use what you know.</p>
          <ul className="mt-4 flex flex-wrap gap-2 font-mono text-xs">
            {['An LLM API', 'Python or Node.js', 'Streamlit or plain HTML', 'Any code editor'].map((t) => <li key={t} className="rounded-md border border-line px-3 py-1.5">{t}</li>)}
          </ul>
          <h3 className="mt-8 flex items-center gap-2 font-semibold"><Laptop className="h-4 w-4 text-aqua" aria-hidden /> Benefits for final-year students</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>A finished project you can explain and demo.</li>
            <li>Confidence using AI APIs in your own work.</li>
            <li>A clear recipe you can repeat for your next idea.</li>
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-8 rounded-2xl border border-line bg-panel p-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold"><Users className="h-6 w-6 text-aqua" aria-hidden /> Bring your friends</h2>
            <p className="mt-3 max-w-xl text-muted">After you register you get a personal link. Each friend who registers through it counts toward your rank on the leaderboard.</p>
          </div>
          <Link to="/leaderboard" className={btn.ghost}><Gift className="h-4 w-4" aria-hidden /> See the leaderboard</Link>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">Questions</h2>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {faqs.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="cursor-pointer list-none font-medium marker:hidden">{q}</summary>
              <p className="mt-2 text-sm text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="border-t border-line/70 bg-panel/40 py-20 text-center">
        <h2 className="mx-auto max-w-2xl px-4 text-3xl font-bold sm:text-4xl">Your first AI project is one hour away.</h2>
        <div className="mt-8 flex justify-center"><CtaLink className={btn.primary} /></div>
      </section>
    </>
  );
}
