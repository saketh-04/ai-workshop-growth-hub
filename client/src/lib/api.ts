import axios from 'axios';

export const http = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '', timeout: 15_000 });

export interface FieldIssue { field: string; message: string }
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details: FieldIssue[] = []) {
    super(message);
  }
}

/** Normalises every failure (validation, 409, 429, network, timeout) into one ApiError the UI can render. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { error?: { code?: string; message?: string; details?: FieldIssue[] } } | undefined;
    if (err.response && body?.error) {
      return new ApiError(err.response.status, body.error.code ?? 'ERROR', body.error.message ?? 'Request failed', body.error.details ?? []);
    }
    if (err.response?.status === 429) return new ApiError(429, 'RATE_LIMITED', 'Too many requests. Please wait a moment and try again.');
    if (err.code === 'ECONNABORTED') return new ApiError(0, 'TIMEOUT', 'The server took too long to respond. Please try again.');
    if (!err.response) return new ApiError(0, 'NETWORK', "Can't reach the server. Check your connection and try again.");
    return new ApiError(err.response.status, 'ERROR', 'Something went wrong. Please try again.');
  }
  return new ApiError(0, 'UNKNOWN', 'Something went wrong. Please try again.');
}
http.interceptors.response.use((r) => r, (e) => Promise.reject(toApiError(e)));

// ---- types mirror the server responses (see PHASE_2_CHECKPOINT.md section 6) ----
export const SOURCES = ['whatsapp', 'college_club', 'linkedin', 'instagram', 'referral', 'other'] as const;
export type Source = (typeof SOURCES)[number];
export const CATEGORIES = ['productivity', 'education', 'healthcare', 'finance', 'career', 'other'] as const;
export type Category = (typeof CATEGORIES)[number];
export type ClientEvent = 'landing_page_view' | 'registration_started' | 'referral_link_clicked' | 'share_clicked';

export interface RegisterPayload {
  name: string; email: string; college: string; branch: string; graduationYear: number; phone?: string; source: Source;
  referralCode?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string;
}
export interface RegisterResponse {
  registrationId: string;
  user: { id: string; name: string; referralCode: string };
  referralPath: string;
  referral: { credited: true } | { credited: false; reason: 'no_code' | 'invalid_code' | 'self_referral' | 'already_referred' };
}
export interface ReferralStats { code: string; referrerName: string; clicks: number; successfulReferrals: number; conversionRate: number; rank: number | null }
export interface LeaderboardEntry { rank: number; displayName: string; college: string; successfulReferrals: number }
export interface LeaderboardResponse { leaderboard: LeaderboardEntry[]; meta: { label: string | null } }
export interface ProjectIdea {
  title: string; oneLiner: string; techStack: string[]; difficulty: 'Beginner' | 'Intermediate'; outline: { minutes: number; step: string }[];
}
export interface ProjectIdeaResponse { source: 'openai' | 'fallback'; idea: ProjectIdea }
export interface ActiveExperiment { id: string; name: string; variants: { key: string; label: string }[] }

export const api = {
  register: (p: RegisterPayload) => http.post<RegisterResponse>('/api/registrations', p).then((r) => r.data),
  trackReferralClick: (code: string) => http.post('/api/referrals/track', { code }).then(() => undefined),
  referralStats: (code: string) => http.get<ReferralStats>(`/api/referrals/${encodeURIComponent(code)}`).then((r) => r.data),
  leaderboard: () => http.get<LeaderboardResponse>('/api/leaderboard').then((r) => r.data),
  projectIdea: (category: Category, userId?: string) =>
    http.post<ProjectIdeaResponse>('/api/ai/project-idea', { category, userId }).then((r) => r.data),
  activeExperiments: () => http.get<{ experiments: ActiveExperiment[] }>('/api/experiments/active').then((r) => r.data.experiments),
  experimentEvent: (id: string, body: { variantKey: string; eventType: 'impression' | 'click' | 'conversion'; userId?: string }) =>
    http.post(`/api/experiments/${id}/event`, body).then(() => undefined),
  event: (body: { eventType: ClientEvent; source?: string; userId?: string; metadata?: Record<string, string | number | boolean> }) =>
    http.post('/api/analytics/events', body).then(() => undefined),
};
