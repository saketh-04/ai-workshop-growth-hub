import { Request } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as analytics from '../services/analyticsService';
import { Dataset } from '../services/analyticsRules';

const dataset = (req: Request) => req.query.dataset as Dataset; // already validated + defaulted by datasetQuerySchema

export const track = asyncHandler(async (req, res) => {
  const { eventType, userId, source, metadata } = req.body;
  await analytics.recordEvent({ eventType, userId, source, metadata });
  res.status(202).json({ accepted: true }); // best-effort: the browser never waits on or retries analytics
});
export const overview = asyncHandler(async (req, res) => { res.json(await analytics.getOverview(dataset(req))); });
export const channels = asyncHandler(async (req, res) => { res.json(await analytics.getChannels(dataset(req))); });
export const funnel = asyncHandler(async (req, res) => { res.json(await analytics.getFunnel(dataset(req))); });
export const referrals = asyncHandler(async (req, res) => { res.json(await analytics.getReferralAnalytics(dataset(req))); });
