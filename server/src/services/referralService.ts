import { Referral } from '../models/Referral';
import { User } from '../models/User';
import { AppError } from '../utils/errors';
import { recordEvent } from './analyticsService';
import { LeaderboardRow, maskName, rankOf } from './leaderboardRules';
import { conversionRate } from './referralRules';

export async function trackReferralClick(code: string): Promise<void> {
  const updated = await User.findOneAndUpdate({ referralCode: code }, { $inc: { referralClicks: 1 } }).select('_id');
  if (!updated) throw new AppError(404, 'REFERRAL_NOT_FOUND', 'Referral code not found');
  await recordEvent({ eventType: 'referral_link_clicked', userId: updated._id, source: 'referral' });
}

export async function getReferralStats(code: string) {
  const user = await User.findOne({ referralCode: code }).select('name referralClicks').lean();
  if (!user) throw new AppError(404, 'REFERRAL_NOT_FOUND', 'Referral code not found');
  const successful = await Referral.countDocuments({ referrerUserId: user._id });
  let rank: number | null = null;
  if (successful > 0) {
    const grouped = await Referral.aggregate<{ _id: unknown; n: number; last: Date }>([
      { $group: { _id: '$referrerUserId', n: { $sum: 1 }, last: { $max: '$createdAt' } } },
    ]);
    const rows: LeaderboardRow[] = grouped.map((g) => ({
      userId: String(g._id), name: '', college: '', successfulReferrals: g.n, lastReferralAt: g.last,
    }));
    rank = rankOf(rows, String(user._id));
  }
  return {
    code,
    referrerName: maskName(user.name),
    clicks: user.referralClicks ?? 0,
    successfulReferrals: successful,
    rank, // null until the student has at least one credited referral
    conversionRate: conversionRate(successful, user.referralClicks ?? 0),
  };
}
