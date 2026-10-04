import { describe, expect, it } from 'vitest';
import { mergeAttribution, parseAttribution } from '../src/lib/attribution';
import { CTA_EXPERIMENT_NAME, DEFAULT_CTA, findCtaExperiment, pickVariant } from '../src/lib/experiment';
import { SHARE_MESSAGE, copyText, linkedinUrl, referralLink, whatsappUrl } from '../src/lib/share';
import { FormValues, mapServerIssues, validateRegistration } from '../src/lib/validation';

const ok: FormValues = { name: 'Priya Sharma', email: 'priya@college.edu', college: 'NIT Trichy', branch: 'ECE', graduationYear: '2027', phone: '', source: 'whatsapp' };

describe('parseAttribution', () => {
  it('reads UTM and referral params', () => {
    expect(parseAttribution('?utm_source=whatsapp&utm_medium=community&utm_campaign=ai-workshop&ref=saketh7x4')).toEqual({
      utmSource: 'whatsapp', utmMedium: 'community', utmCampaign: 'ai-workshop', ref: 'SAKETH7X4',
    });
  });
  it('returns nothing for an empty query', () => expect(Object.values(parseAttribution('')).every((v) => v === undefined)).toBe(true));
  it('drops values the server would reject (symbols, operators, too long, bad ref)', () => {
    const a = parseAttribution(`?utm_source=${encodeURIComponent('$ne')}&utm_campaign=${'x'.repeat(61)}&ref=not-a-code!`);
    expect(a.utmSource).toBeUndefined();
    expect(a.utmCampaign).toBeUndefined();
    expect(a.ref).toBeUndefined();
  });
});
describe('mergeAttribution', () => {
  it('keeps the earlier campaign when a later visit has no params', () =>
    expect(mergeAttribution({ utmSource: 'linkedin' }, {})).toEqual({ utmSource: 'linkedin' }));
  it('lets new params override old ones', () =>
    expect(mergeAttribution({ utmSource: 'linkedin', ref: 'AAA2B3' }, { utmSource: 'instagram' })).toEqual({ utmSource: 'instagram', ref: 'AAA2B3' }));
});

describe('share helpers', () => {
  const link = referralLink('https://app.example', 'SAKETH7X4');
  it('builds the referral link', () => expect(link).toBe('https://app.example/register?ref=SAKETH7X4'));
  it('WhatsApp URL carries the required message and the link', () => {
    const u = new URL(whatsappUrl(link));
    expect(u.origin + u.pathname).toBe('https://wa.me/');
    expect(u.searchParams.get('text')).toBe(`${SHARE_MESSAGE} ${link}`);
  });
  it('LinkedIn URL carries the link', () => expect(new URL(linkedinUrl(link)).searchParams.get('url')).toBe(link));
  it('copy text = message + link', () => expect(copyText(link)).toBe(`${SHARE_MESSAGE} ${link}`));
  it('uses the exact message from the brief', () => expect(SHARE_MESSAGE).toBe('I just registered for Build Your First AI Project in 60 Minutes. Want to build one too?'));
});

describe('validateRegistration', () => {
  it('accepts a valid form (phone optional)', () => expect(validateRegistration(ok)).toEqual({}));
  it('accepts a valid Indian phone', () => expect(validateRegistration({ ...ok, phone: '+91 9876543210' })).toEqual({}));
  it.each([
    ['name', { name: 'A' }], ['email', { email: 'nope' }], ['college', { college: '' }], ['branch', { branch: ' ' }],
    ['graduationYear', { graduationYear: '' }], ['phone', { phone: '12345' }], ['source', { source: 'tiktok' }],
  ])('flags %s', (field, patch) => expect(validateRegistration({ ...ok, ...patch })).toHaveProperty(field));
  it('reports every problem at once', () => expect(Object.keys(validateRegistration({ ...ok, name: '', email: '', source: '' })).sort()).toEqual(['email', 'name', 'source']));
});
describe('mapServerIssues', () => {
  it('maps known fields and ignores the rest', () =>
    expect(mapServerIssues([{ field: 'email', message: 'Enter a valid email' }, { field: 'utmSource', message: 'x' }])).toEqual({ email: 'Enter a valid email' }));
});

describe('experiment helpers', () => {
  const v = [{ key: 'A', label: 'Register Now' }, { key: 'B', label: 'Build My AI Project' }];
  it('pickVariant is uniform and stays in range', () => {
    expect(pickVariant(v, () => 0).key).toBe('A');
    expect(pickVariant(v, () => 0.99).key).toBe('B');
    expect(pickVariant(v, () => 1).key).toBe('B');
  });
  it('findCtaExperiment matches the CTA experiment by name (case-insensitive) and needs 2+ variants', () => {
    expect(CTA_EXPERIMENT_NAME).toBe('registration cta');
    expect(findCtaExperiment([{ id: '1', name: 'Hero headline', variants: v }, { id: '2', name: ' Registration CTA ', variants: v }])?.id).toBe('2');
    expect(findCtaExperiment([{ id: '3', name: 'Registration CTA', variants: [v[0]] }])).toBeUndefined();
    expect(findCtaExperiment([])).toBeUndefined();
  });
  it('defaults to the brief\'s CTA wording', () => expect(DEFAULT_CTA).toBe('Reserve My Spot'));
});
