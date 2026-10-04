import { asyncHandler } from '../utils/asyncHandler';
import { getLeaderboard, getLeaderboardLabel } from '../services/leaderboardService';

export const list = asyncHandler(async (_req, res) => {
  const [leaderboard, label] = await Promise.all([getLeaderboard(10), getLeaderboardLabel()]);
  res.json({ leaderboard, meta: { label } });
});
