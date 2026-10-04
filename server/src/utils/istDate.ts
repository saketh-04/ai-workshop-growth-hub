// Campaign days are Indian calendar days (IST, UTC+5:30), matching the Mongo $dateToString timezone below.
const IST_OFFSET_MS = 330 * 60_000;
export const DAY_MS = 86_400_000;
export const IST_TIMEZONE = 'Asia/Kolkata';

/** "2026-10-03" for the IST calendar day containing `d`. */
export const istDateKey = (d: Date): string => new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
/** The instant when that IST day starts. */
export const istDayStart = (key: string): Date => new Date(Date.parse(`${key}T00:00:00Z`) - IST_OFFSET_MS);
export const addDays = (key: string, n: number): string =>
  new Date(Date.parse(`${key}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
