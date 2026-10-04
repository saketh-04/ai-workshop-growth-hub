import { readJson, removeKey, writeJson } from './storage';

// sessionStorage: the admin token disappears when the tab closes. It is a short-lived JWT, never a password.
const KEY = 'gh_admin_token';
export const getToken = (): string | null => readJson<string>('session', KEY);
export const setToken = (t: string): void => writeJson('session', KEY, t);
export const clearToken = (): void => removeKey('session', KEY);
