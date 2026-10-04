import { asyncHandler } from '../utils/asyncHandler';
import { getReferralStats, trackReferralClick } from '../services/referralService';

export const track = asyncHandler(async (req, res) => {
  await trackReferralClick(req.body.code);
  res.status(204).end();
});

export const getByCode = asyncHandler(async (req, res) => {
  res.json(await getReferralStats(req.params.code));
});
