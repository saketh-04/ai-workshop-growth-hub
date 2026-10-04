export interface LeaderboardRow {
  userId: string;
  name: string;
  college: string;
  successfulReferrals: number;
  lastReferralAt: Date; // when they reached their current count
}
export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  college: string;
  successfulReferrals: number;
}

/** "Saketh Kumar" -> "Saketh K." (public page: don't show full names). */
export function maskName(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest[rest.length - 1];
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

/**
 * Most referrals first. Ties go to whoever reached that count first,
 * so ranks are always unique and deterministic.
 */
const byRank = (a: LeaderboardRow, b: LeaderboardRow) =>
  b.successfulReferrals - a.successfulReferrals || a.lastReferralAt.getTime() - b.lastReferralAt.getTime();

/** 1-based rank of one student using the same ordering as the leaderboard; null if they have no referrals. */
export function rankOf(rows: LeaderboardRow[], userId: string): number | null {
  const i = [...rows].sort(byRank).findIndex((r) => r.userId === userId);
  return i < 0 ? null : i + 1;
}

export function buildLeaderboard(rows: LeaderboardRow[], limit = 10): LeaderboardEntry[] {
  return [...rows]
    .sort(byRank)
    .slice(0, limit)
    .map((r, i) => ({
      rank: i + 1,
      displayName: maskName(r.name),
      college: r.college,
      successfulReferrals: r.successfulReferrals,
    }));
}
