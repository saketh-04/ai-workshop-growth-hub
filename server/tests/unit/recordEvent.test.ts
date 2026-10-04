import { recordEvent } from '../../src/services/analyticsService';

describe('recordEvent without a database connection', () => {
  it('returns false immediately instead of hanging or throwing (analytics never blocks a request)', async () => {
    const started = Date.now();
    await expect(recordEvent({ eventType: 'landing_page_view' })).resolves.toBe(false);
    expect(Date.now() - started).toBeLessThan(200);
  });
});
