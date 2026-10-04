import { addDays, istDateKey, istDayStart } from '../../src/utils/istDate';

describe('IST date helpers', () => {
  it('maps a late-UTC instant to the next IST day', () =>
    expect(istDateKey(new Date('2026-10-03T19:00:00Z'))).toBe('2026-10-04')); // 00:30 IST
  it('keeps an early-UTC instant on the same IST day', () =>
    expect(istDateKey(new Date('2026-10-03T10:00:00Z'))).toBe('2026-10-03'));
  it('istDayStart is IST midnight (18:30 UTC the day before) and round-trips', () => {
    const start = istDayStart('2026-10-04');
    expect(start.toISOString()).toBe('2026-10-03T18:30:00.000Z');
    expect(istDateKey(start)).toBe('2026-10-04');
  });
  it('addDays crosses month boundaries', () => expect(addDays('2026-10-30', 3)).toBe('2026-11-02'));
});
