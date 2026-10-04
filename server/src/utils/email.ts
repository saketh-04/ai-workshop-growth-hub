/**
 * Alias-proof email key used to block duplicate / self-referral abuse.
 * - lowercases
 * - strips "+tag" (saketh+2@x.com -> saketh@x.com)
 * - strips dots for Gmail (s.aketh@gmail.com -> saketh@gmail.com)
 */
export function canonicalEmail(email: string): string {
  const [rawLocal, rawDomain = ''] = email.trim().toLowerCase().split('@');
  const domain = rawDomain === 'googlemail.com' ? 'gmail.com' : rawDomain;
  let local = rawLocal.split('+')[0];
  if (domain === 'gmail.com') local = local.replace(/\./g, '');
  return `${local}@${domain}`;
}
