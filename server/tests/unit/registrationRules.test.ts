import { formatRegistrationId, resolveChannel } from '../../src/services/registrationRules';

describe('resolveChannel', () => {
  it('credited referral wins over everything', () =>
    expect(resolveChannel({ referralCredited: true, utmSource: 'linkedin', selfReported: 'whatsapp' })).toBe('referral'));
  it('UTM source beats self-reported', () =>
    expect(resolveChannel({ referralCredited: false, utmSource: 'instagram', selfReported: 'other' })).toBe('instagram'));
  it('falls back to what the student said', () =>
    expect(resolveChannel({ referralCredited: false, selfReported: 'college_club' })).toBe('college_club'));
});

describe('formatRegistrationId', () => {
  it('uses the last 8 chars, uppercased', () =>
    expect(formatRegistrationId('507f1f77bcf86cd799439011')).toBe('AIW-99439011'));
});
