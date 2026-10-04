import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ProjectPicker } from '../components/ProjectPicker';
import { ShareButtons } from '../components/ShareButtons';
import { EmptyState, btn } from '../components/ui';
import type { RegisterResponse } from '../lib/api';
import { referralLink } from '../lib/share';
import { getStudent } from '../lib/student';

export default function Welcome() {
  const student = getStudent();
  const referral = (useLocation().state as { referral?: RegisterResponse['referral'] } | null)?.referral;
  if (!student) {
    return <div className="mx-auto max-w-xl px-4 py-16"><EmptyState title="No registration found on this device" body="Register to get your referral link, or open your dashboard if you already have a code." action={<Link to="/register" className={btn.primary}>Register free</Link>} /></div>;
  }
  const link = referralLink(window.location.origin, student.referralCode);
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6 sm:py-16">
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
        <CheckCircle2 className="h-8 w-8 text-aqua" aria-hidden />
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">You're in!</h1>
        <p className="mt-1 text-muted">Welcome, {student.name.split(' ')[0]}. Your spot is confirmed.</p>
        {referral && !referral.credited && referral.reason !== 'no_code' && (
          <p className="mt-4 rounded-lg border border-line bg-ink/60 px-4 py-3 text-sm text-muted">Your registration is complete. The referral code in your link couldn't be credited to anyone, which doesn't affect your spot.</p>
        )}
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs text-muted">Registration ID</dt><dd className="mt-1 font-mono text-sm">{student.registrationId}</dd></div>
          <div><dt className="text-xs text-muted">Your referral code</dt><dd className="mt-1 font-mono text-sm text-saffron">{student.referralCode}</dd></div>
        </dl>
        <div className="mt-6">
          <p className="text-xs text-muted">Your referral link</p>
          <p className="mt-1 break-all rounded-lg border border-line bg-ink px-3 py-2 font-mono text-xs">{link}</p>
          <div className="mt-4"><ShareButtons link={link} /></div>
        </div>
        <Link to="/dashboard" className="mt-6 inline-block text-sm font-semibold text-saffron underline-offset-4 hover:underline">Track your referrals</Link>
      </motion.div>
      <ProjectPicker userId={student.id} />
    </div>
  );
}
