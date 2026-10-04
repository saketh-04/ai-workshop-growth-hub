import { conversionRate, evaluateReferral } from '../../src/services/referralRules';

const referrer = { email: 'saketh@gmail.com' };
const base = { code: 'SAKETH7X4', referrer, newEmail: 'priya@college.edu', alreadyReferred: false };

describe('evaluateReferral', () => {
  it('credits a valid referral', () => expect(evaluateReferral(base)).toEqual({ credited: true }));
  it('does nothing without a code', () =>
    expect(evaluateReferral({ ...base, code: undefined })).toEqual({ credited: false, reason: 'no_code' }));
  it('rejects an unknown code', () =>
    expect(evaluateReferral({ ...base, referrer: null })).toEqual({ credited: false, reason: 'invalid_code' }));
  it('blocks self-referral with the same email', () =>
    expect(evaluateReferral({ ...base, newEmail: 'saketh@gmail.com' })).toEqual({
      credited: false,
      reason: 'self_referral',
    }));
  it('blocks self-referral via +alias and gmail dots', () => {
    expect(evaluateReferral({ ...base, newEmail: 'saketh+2@gmail.com' }).credited).toBe(false);
    expect(evaluateReferral({ ...base, newEmail: 'sa.keth@gmail.com' }).credited).toBe(false);
  });
  it('blocks a second credit for an already-referred student (duplicate referral)', () =>
    expect(evaluateReferral({ ...base, alreadyReferred: true })).toEqual({
      credited: false,
      reason: 'already_referred',
    }));
});

describe('conversionRate', () => {
  it('is 0 with no clicks', () => expect(conversionRate(3, 0)).toBe(0));
  it('computes successful / clicks', () => expect(conversionRate(1, 4)).toBe(0.25));
  it('caps at 100%', () => expect(conversionRate(5, 2)).toBe(1));
});
