import { Loader2, Lock } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ErrorNote, btn, cx } from '../../components/ui';
import { adminApi } from '../../lib/adminApi';
import { getToken, setToken } from '../../lib/adminAuth';
import { ApiError, toApiError } from '../../lib/api';

const field = 'w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm outline-none transition focus:border-aqua';

export default function AdminLogin() {
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/admin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  if (getToken()) return <Navigate to="/admin" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError(new ApiError(400, 'VALIDATION_ERROR', 'Enter your admin email and password.')); return; }
    setBusy(true); setError(null);
    try { setToken(await adminApi.login(email.trim(), password)); navigate(from, { replace: true }); }
    catch (err) { setError(toApiError(err)); setPassword(''); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} noValidate className="w-full max-w-sm rounded-2xl border border-line bg-panel p-6 sm:p-8" aria-labelledby="login-title">
        <Lock className="h-6 w-6 text-saffron" aria-hidden />
        <h1 id="login-title" className="mt-3 text-2xl font-extrabold tracking-tight">Admin sign in</h1>
        <p className="mt-1 text-sm text-muted">Growth console for the workshop campaign.</p>
        <div className="mt-6 space-y-4">
          <div><label htmlFor="admin-email" className="mb-1.5 block text-sm font-medium">Email</label>
            <input id="admin-email" type="email" autoComplete="username" className={field} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium">Password</label>
            <input id="admin-password" type="password" autoComplete="current-password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          {error && <ErrorNote message={error.status === 401 ? 'Incorrect email or password.' : error.message} />}
          <button type="submit" disabled={busy} className={cx(btn.primary, 'w-full')}>{busy ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Signing in…</> : 'Sign in'}</button>
        </div>
      </form>
    </div>
  );
}
