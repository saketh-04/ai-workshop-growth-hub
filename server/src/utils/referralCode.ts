// Unambiguous suffix alphabet: no 0/O or 1/I confusion when typed from a screenshot.
const SUFFIX_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SUFFIX_LENGTH = 3;

/** Format check only (does not prove the code exists). e.g. SAKETH7X4 */
export const REFERRAL_CODE_REGEX = /^[A-Z]{1,6}[A-Z2-9]{3}$/;

/** Name prefix (up to 6 letters) + 3 random chars. `random` is injectable for tests. */
export function generateReferralCode(name: string, random: () => number = Math.random): string {
  const prefix =
    name
      .normalize('NFD')
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase()
      .slice(0, 6) || 'AI';
  let suffix = '';
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    suffix += SUFFIX_ALPHABET[Math.floor(random() * SUFFIX_ALPHABET.length)];
  }
  return prefix + suffix;
}
