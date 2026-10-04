import { Referral } from '../models/Referral';
import { SIMULATED_LABEL } from './analyticsRules';
import { LeaderboardRow, buildLeaderboard } from './leaderboardRules';

export async function getLeaderboard(limit = 10) {
  const grouped = await Referral.aggregate<{
    _id: unknown;
    count: number;
    lastReferralAt: Date;
    user: { name: string; college: string };
  }>([
    { $match: { converted: true } },
    { $group: { _id: '$referrerUserId', count: { $sum: 1 }, lastReferralAt: { $max: '$createdAt' } } },
    { $sort: { count: -1, lastReferralAt: 1 } },
    { $limit: limit },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
  ]);

  const rows: LeaderboardRow[] = grouped.map((g) => ({
    userId: String(g._id),
    name: g.user.name,
    college: g.user.college,
    successfulReferrals: g.count,
    lastReferralAt: g.lastReferralAt,
  }));
  return buildLeaderboard(rows, limit); // ranking + name masking live in the pure, unit-tested function
}

/** Shown above the public leaderboard whenever any seeded demo referral exists. */
export async function getLeaderboardLabel(): Promise<string | null> {
  return (await Referral.exists({ isDemo: true })) ? SIMULATED_LABEL : null;
}
