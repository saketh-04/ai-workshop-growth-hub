import { Loader2 } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorNote, btn, cx } from '../components/ui';
import { ApiError, ReferralStats, SOURCES, Source, api, toApiError } from '../lib/api';
import { getAttribution } from '../lib/attribution';
import { reportExperiment, resolveAssignment } from '../lib/experiment';
import { readJson, writeJson } from '../lib/storage';
import { saveStudent } from '../lib/student';
import { trackOnce } from '../lib/track';
import { FormErrors, FormValues, GRAD_YEARS, SOURCE_LABELS, mapServerIssues, validateRegistration } from '../lib/validation';
import { useCta } from '../lib/useCta';

const BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'Mechanical', 'Civil', 'AI & DS'];
const input = (bad: boolean) => cx('w-full rounded-xl border bg-ink px-4 py-3 text-sm outline-none transition placeholder:text-muted/60 focus:border-aqua', bad ? 'border-danger' : 'border-line');

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const attr = getAttribution();
  const cta = useCta();
  const [values, setValues] = useState<FormValues>({ name: '', email: '', college: '', branch: '', graduationYear: '', phone: '', source: attr.ref ? 'referral' : '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [referrer, setReferrer] = useState<ReferralStats | null>(null);

  // A referral link was opened: record the click once per session and show who invited the student.
  useEffect(() => {
    if (!attr.ref) return;
    const key = `gh_ref_tracked_${attr.ref}`;
    if (!readJson<boolean>('session', key)) { writeJson('session', key, true); void api.trackReferralClick(attr.ref).catch(() => undefined); }
    void api.referralStats(attr.ref).then(setReferrer).catch(() => undefined);
  }, [attr.ref]);

  const set = (k: keyof FormValues) => (e: { target: { value: string } }) => {
    trackOnce('registration_started');
    setValues((v) => ({ ...v, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };
  const aria = (k: keyof FormValues, hint?: boolean) => ({ 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `${k}-err` : hint ? `${k}-hint` : undefined });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const found = validateRegistration(values);
    setErrors(found);
    if (Object.keys(found).length) { document.getElementById(Object.keys(found)[0])?.focus(); return; }
    setSubmitting(true);
    try {
      const res = await api.register({
        name: values.name.trim(), email: values.email.trim(), college: values.college.trim(), branch: values.branch.trim(),
        graduationYear: Number(values.graduationYear), phone: values.phone.trim() || undefined, source: values.source as Source,
        referralCode: attr.ref, utmSource: attr.utmSource, utmMedium: attr.utmMedium, utmCampaign: attr.utmCampaign,
      });
      saveStudent({ id: res.user.id, name: res.user.name, referralCode: res.user.referralCode, registrationId: res.registrationId });
      const assignment = await resolveAssignment();
      if (assignment) reportExperiment('conversion', assignment); // the registration this experiment is trying to win
      navigate('/welcome', { replace: true, state: { referral: res.referral } });
    } catch (err) {
      const apiErr = toApiError(err);
      if (apiErr.code === 'EMAIL_ALREADY_REGISTERED') setErrors({ email: 'This email is already registered. You can open your referral dashboard instead.' });
      else if (apiErr.details.length) setErrors(mapServerIssues(apiErr.details));
      else setFormError(apiErr);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Reserve your spot</h1>
      <p className="mt-2 text-muted">Free for final-year engineering students. Takes about a minute.</p>
      {referrer && <p className="mt-5 rounded-xl border border-aqua/30 bg-aqua/10 px-4 py-3 text-sm">You were invited by <strong>{referrer.referrerName}</strong>.</p>}

      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <Field id="name" label="Full name" error={errors.name}><input id="name" autoComplete="name" className={input(!!errors.name)} value={values.name} onChange={set('name')} {...aria('name')} /></Field>
        <Field id="email" label="Email" error={errors.email}><input id="email" type="email" autoComplete="email" inputMode="email" className={input(!!errors.email)} value={values.email} onChange={set('email')} {...aria('email')} /></Field>
        <Field id="college" label="College" error={errors.college}><input id="college" autoComplete="organization" className={input(!!errors.college)} value={values.college} onChange={set('college')} {...aria('college')} /></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="branch" label="Branch" error={errors.branch}>
            <input id="branch" list="branches" className={input(!!errors.branch)} value={values.branch} onChange={set('branch')} {...aria('branch')} />
            <datalist id="branches">{BRANCHES.map((b) => <option key={b} value={b} />)}</datalist>
          </Field>
          <Field id="graduationYear" label="Graduation year" error={errors.graduationYear}>
            <select id="graduationYear" className={input(!!errors.graduationYear)} value={values.graduationYear} onChange={set('graduationYear')} {...aria('graduationYear')}>
              <option value="">Select year</option>{GRAD_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
        </div>
        <Field id="phone" label="Phone (optional)" error={errors.phone} hint="10-digit mobile number. Optional.">
          <input id="phone" type="tel" autoComplete="tel" inputMode="tel" className={input(!!errors.phone)} value={values.phone} onChange={set('phone')} {...aria('phone', true)} />
        </Field>
        <Field id="source" label="How did you hear about us?" error={errors.source}>
          <select id="source" className={input(!!errors.source)} value={values.source} onChange={set('source')} {...aria('source')}>
            <option value="">Select one</option>{SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
          </select>
        </Field>
        {formError && <ErrorNote message={formError.message} />}
        <button type="submit" disabled={submitting} className={cx(btn.primary, 'w-full')}>
          {submitting ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Registering…</> : cta.label}
        </button>
        <p className="text-center text-xs text-muted">Already registered? <Link to="/dashboard" className="text-fg underline underline-offset-4">Open your referral dashboard</Link></p>
      </form>
    </div>
  );
}
