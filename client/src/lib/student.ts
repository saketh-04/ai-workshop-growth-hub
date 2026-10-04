import { readJson, writeJson } from './storage';

/** There are no student accounts: the code from registration (kept in this browser) is the key to the dashboard. */
export interface SavedStudent { id: string; name: string; referralCode: string; registrationId: string }
const KEY = 'gh_student';
export const getStudent = (): SavedStudent | null => readJson<SavedStudent>('local', KEY);
export const saveStudent = (s: SavedStudent): void => writeJson('local', KEY, s);
