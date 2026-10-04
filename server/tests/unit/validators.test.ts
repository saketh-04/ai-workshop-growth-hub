import { projectIdeaSchema } from '../../src/validators/ai';
import { registerSchema } from '../../src/validators/registration';

const valid = {
  name: ' Saketh Kumar ',
  email: ' SAKETH@College.edu ',
  college: 'IIT Madras',
  branch: 'CSE',
  graduationYear: '2027',
  source: 'whatsapp',
};

describe('registerSchema', () => {
  it('accepts valid input and normalises it', () => {
    const out = registerSchema.parse(valid);
    expect(out.name).toBe('Saketh Kumar');
    expect(out.email).toBe('saketh@college.edu');
    expect(out.graduationYear).toBe(2027);
  });
  it('treats blank optional fields as missing', () => {
    const out = registerSchema.parse({ ...valid, phone: '', referralCode: '', utmSource: '' });
    expect(out.phone).toBeUndefined();
    expect(out.referralCode).toBeUndefined();
  });
  it('uppercases referral codes', () =>
    expect(registerSchema.parse({ ...valid, referralCode: 'saketh7x4' }).referralCode).toBe('SAKETH7X4'));
  it('normalises UTM values', () =>
    expect(registerSchema.parse({ ...valid, utmSource: 'College Club' }).utmSource).toBe('college_club'));
  it.each([
    ['bad email', { email: 'nope' }],
    ['short name', { name: 'A' }],
    ['unknown source', { source: 'tiktok' }],
    ['graduation year too early', { graduationYear: 2010 }],
    ['bad phone', { phone: '12345' }],
    ['bad referral code', { referralCode: '!!' }],
    ['object injected as email (NoSQL operator)', { email: { $gt: '' } }],
  ])('rejects %s', (_label, patch) => {
    expect(registerSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
  it('accepts a valid Indian phone', () =>
    expect(registerSchema.safeParse({ ...valid, phone: '+91 98765 43210'.replace(/ (?=\d{5})/g, '') }).success).toBe(true));
});

describe('projectIdeaSchema', () => {
  const idea = {
    title: 'Resume Helper',
    oneLiner: 'Improves resume bullets with an LLM.',
    techStack: ['Node.js', 'LLM API'],
    difficulty: 'Beginner',
    outline: [
      { minutes: 20, step: 'Setup' },
      { minutes: 30, step: 'Build' },
      { minutes: 10, step: 'Ship' },
    ],
  };
  it('accepts an outline summing to 60', () => expect(projectIdeaSchema.safeParse(idea).success).toBe(true));
  it('rejects an outline that does not sum to 60', () =>
    expect(projectIdeaSchema.safeParse({ ...idea, outline: [...idea.outline.slice(0, 2), { minutes: 15, step: 'Ship' }] }).success).toBe(false));
});
