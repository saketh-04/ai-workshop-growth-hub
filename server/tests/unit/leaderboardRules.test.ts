import { LeaderboardRow, buildLeaderboard, maskName, rankOf } from '../../src/services/leaderboardRules';

const row = (name: string, n: number, day: number): LeaderboardRow => ({
  userId: name,
  name,
  college: 'IIT Test',
  successfulReferrals: n,
  lastReferralAt: new Date(2026, 9, day),
});

describe('maskName', () => {
  it('shows first name + last initial', () => expect(maskName('Saketh Kumar')).toBe('Saketh K.'));
  it('keeps single names', () => expect(maskName('Priya')).toBe('Priya'));
  it('uses the last word as the surname', () => expect(maskName('A B Rao')).toBe('A R.'));
});

describe('buildLeaderboard', () => {
  it('orders by referrals desc and assigns ranks from 1', () => {
    const out = buildLeaderboard([row('Low One', 1, 1), row('Top One', 5, 1), row('Mid One', 3, 1)]);
    expect(out.map((e) => [e.rank, e.displayName])).toEqual([
      [1, 'Top O.'],
      [2, 'Mid O.'],
      [3, 'Low O.'],
    ]);
  });
  it('breaks ties by who reached the count first', () => {
    const out = buildLeaderboard([row('Late Guy', 3, 9), row('Early Guy', 3, 2)]);
    expect(out[0].displayName).toBe('Early G.');
  });
  it('respects the limit and does not mutate input', () => {
    const rows = [row('A A', 1, 1), row('B B', 2, 1), row('C C', 3, 1)];
    expect(buildLeaderboard(rows, 2)).toHaveLength(2);
    expect(rows[0].name).toBe('A A');
  });
  it('returns an empty list for no referrals', () => expect(buildLeaderboard([])).toEqual([]));
});

describe('rankOf', () => {
  const rows = [row('Late Guy', 3, 9), row('Early Guy', 3, 2), row('Top One', 5, 5)];
  it('uses the same ordering as the leaderboard (count desc, earlier first)', () => {
    expect(rankOf(rows, 'Top One')).toBe(1);
    expect(rankOf(rows, 'Early Guy')).toBe(2);
    expect(rankOf(rows, 'Late Guy')).toBe(3);
  });
  it('is null for a student with no referrals', () => expect(rankOf(rows, 'Nobody')).toBeNull());
  it('agrees with buildLeaderboard positions', () => {
    const board = buildLeaderboard(rows);
    rows.forEach((r) => expect(rankOf(rows, r.userId)).toBe(board.find((e) => e.displayName === r.name.split(' ')[0] + ' ' + r.name.split(' ')[1][0] + '.')!.rank));
  });
});
