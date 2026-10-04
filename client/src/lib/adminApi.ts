import { ApiError, http } from './api';
import { clearToken, getToken } from './adminAuth';

export type Dataset = 'all' | 'real' | 'demo';
export interface Meta { dataset: Dataset; demoRecords: number; label: string | null }

export interface Overview {
  meta: Meta;
  campaign: { name: string | null; days: number; budgetInr: number; startDate: string };
  totals: { registrations: number; target: number; progressPercent: number; referralRegistrations: number; referralShare: number; visitorToRegistrationRate: number; activeReferrers: number };
  daily: { day: number; date: string; registrations: number; referralRegistrations: number; cumulative: number }[];
}
export interface ChannelRow { name: string; registrations: number; share: number; landingViews: number | null; conversionRate: number | null }
export interface Channels {
  meta: Meta; totalRegistrations: number; bySource: ChannelRow[];
  byMedium: { name: string; registrations: number; share: number }[]; byCampaign: { name: string; registrations: number; share: number }[];
}
export interface FunnelStep { key: string; label: string; count: number; rateFromPrevious: number | null; rateFromTop: number }
export interface Funnel { meta: Meta; steps: FunnelStep[]; visitorToRegistration: number; startToCompletion: number; referralShareOfRegistrations: number }
export interface ReferralAnalytics {
  meta: Meta; totalClicks: number; successfulReferrals: number; conversionRate: number; activeReferrers: number;
  topReferrers: { rank: number; displayName: string; college: string; referrals: number; clicks: number; conversionRate: number }[];
}
export interface VariantStats { key: string; label: string; impressions: number; clicks: number; conversions: number; clickRate: number; conversionRate: number }
export type Readout =
  | { verdict: 'simulated' | 'insufficient_data' | 'not_evaluated'; message: string }
  | { verdict: 'no_clear_difference'; message: string; pValue: number }
  | { verdict: 'leading'; message: string; pValue: number; leader: string };
export interface ExperimentView {
  id: string; name: string; hypothesis: string; description: string; status: 'draft' | 'running' | 'completed';
  startDate: string | null; endDate: string | null; isSimulated: boolean; label: string | null; variants: VariantStats[]; readout: Readout;
}
export interface CreateExperimentPayload {
  name: string; hypothesis?: string; description?: string; status: 'draft' | 'running'; variants: { key: string; label: string }[];
}

const auth = () => ({ headers: { Authorization: `Bearer ${getToken() ?? ''}` } });
/** A 401 means the token is missing/expired: forget it so the route guard sends the admin to the login page. */
async function guarded<T>(p: Promise<T>): Promise<T> {
  try { return await p; } catch (e) { if (e instanceof ApiError && e.status === 401) clearToken(); throw e; }
}
const get = <T,>(url: string, dataset?: Dataset) => guarded(http.get<T>(url, { ...auth(), params: dataset ? { dataset } : undefined }).then((r) => r.data));

export const adminApi = {
  login: (email: string, password: string) => http.post<{ token: string }>('/api/auth/login', { email, password }).then((r) => r.data.token),
  me: () => get<{ admin: { email: string } }>('/api/auth/me'),
  overview: (d: Dataset) => get<Overview>('/api/analytics/overview', d),
  channels: (d: Dataset) => get<Channels>('/api/analytics/channels', d),
  funnel: (d: Dataset) => get<Funnel>('/api/analytics/funnel', d),
  referrals: (d: Dataset) => get<ReferralAnalytics>('/api/analytics/referrals', d),
  experiments: () => get<{ experiments: ExperimentView[] }>('/api/experiments').then((r) => r.experiments),
  setExperimentStatus: (id: string, status: 'running' | 'completed') =>
    guarded(http.patch<ExperimentView>(`/api/experiments/${id}/status`, { status }, auth()).then((r) => r.data)),
  createExperiment: (p: CreateExperimentPayload) => guarded(http.post<ExperimentView>('/api/experiments', p, auth()).then((r) => r.data)),
};
