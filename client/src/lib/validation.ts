import { SOURCES, Source } from './api';

export interface FormValues { name: string; email: string; college: string; branch: string; graduationYear: string; phone: string; source: string }
export type FormErrors = Partial<Record<keyof FormValues, string>>;

export const GRAD_YEARS = [2026, 2027, 2028];
export const SOURCE_LABELS: Record<Source, string> = {
  whatsapp: 'WhatsApp', college_club: 'College club', linkedin: 'LinkedIn', instagram: 'Instagram', referral: 'A friend (referral)', other: 'Other',
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^(\+91[\s-]?)?[6-9]\d{9}$/;

/** Client-side mirror of the server's rules so students get instant feedback; the server still has the final say. */
export function validateRegistration(v: FormValues): FormErrors {
  const e: FormErrors = {};
  const name = v.name.trim();
  if (name.length < 2) e.name = 'Enter your full name.';
  else if (name.length > 80) e.name = 'Name is too long (max 80 characters).';
  if (!EMAIL.test(v.email.trim())) e.email = 'Enter a valid email address.';
  if (v.college.trim().length < 2) e.college = 'Enter your college name.';
  if (v.branch.trim().length < 2) e.branch = 'Enter your branch.';
  const year = Number(v.graduationYear);
  if (!Number.isInteger(year) || year < 2025 || year > 2030) e.graduationYear = 'Select your graduation year.';
  if (v.phone.trim() && !PHONE.test(v.phone.trim())) e.phone = 'Enter a 10-digit Indian mobile number, or leave this blank.';
  if (!(SOURCES as readonly string[]).includes(v.source)) e.source = 'Tell us how you found this workshop.';
  return e;
}

/** Map server field-level issues (VALIDATION_ERROR details) onto form fields. */
export function mapServerIssues(issues: { field: string; message: string }[]): FormErrors {
  const out: FormErrors = {};
  const fields: (keyof FormValues)[] = ['name', 'email', 'college', 'branch', 'graduationYear', 'phone', 'source'];
  for (const i of issues) if ((fields as string[]).includes(i.field)) out[i.field as keyof FormValues] = i.message;
  return out;
}
