import { REFERRAL_CODE_REGEX, generateReferralCode } from '../../src/utils/referralCode';

describe('generateReferralCode', () => {
  const fixed = (v: number) => () => v;
  it('uses up to 6 letters of the name plus a 3-char suffix', () => {
    const code = generateReferralCode('Saketh Kumar', fixed(0));
    expect(code).toBe('SAKETHAAA');
    expect(code).toMatch(REFERRAL_CODE_REGEX);
  });
  it('strips accents, digits and symbols', () => {
    expect(generateReferralCode('Zoë 99!', fixed(0)).startsWith('ZOE')).toBe(true);
  });
  it('falls back to "AI" when the name has no latin letters', () => {
    expect(generateReferralCode('राहुल', fixed(0)).startsWith('AI')).toBe(true);
  });
  it('never produces ambiguous suffix characters (0, 1, O, I)', () => {
    for (let i = 0; i < 300; i++) {
      const suffix = generateReferralCode('A').slice(-3);
      expect(suffix).not.toMatch(/[01OI]/);
    }
  });
  it('always matches the validation regex', () => {
    for (let i = 0; i < 200; i++) expect(generateReferralCode('Priya Sharma')).toMatch(REFERRAL_CODE_REGEX);
  });
});
