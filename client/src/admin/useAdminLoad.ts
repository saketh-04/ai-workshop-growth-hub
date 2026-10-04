import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, toApiError } from '../lib/api';

/** Loads admin data; ignores stale responses when `key` changes; a 401 sends the admin back to the login page. */
export function useAdminLoad<T>(fn: () => Promise<T>, key: string) {
  const navigate = useNavigate();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const latest = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async () => {
    const id = ++latest.current;
    setLoading(true); setError(null);
    try {
      const result = await fnRef.current();
      if (id === latest.current) setData(result);
    } catch (e) {
      const err = toApiError(e);
      if (id !== latest.current) return;
      if (err.status === 401) navigate('/admin/login', { replace: true });
      else setError(err);
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { void reload(); }, [reload, key]);
  return { data, error, loading, reload };
}
