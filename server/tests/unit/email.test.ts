import { canonicalEmail } from '../../src/utils/email';

describe('canonicalEmail', () => {
  it('lowercases and trims', () => expect(canonicalEmail('  Saketh@College.EDU ')).toBe('saketh@college.edu'));
  it('removes +tags', () => expect(canonicalEmail('saketh+ref@college.edu')).toBe('saketh@college.edu'));
  it('removes dots only for gmail', () => {
    expect(canonicalEmail('s.a.keth@gmail.com')).toBe('saketh@gmail.com');
    expect(canonicalEmail('s.aketh@college.edu')).toBe('s.aketh@college.edu');
  });
  it('treats googlemail.com as gmail.com', () => expect(canonicalEmail('a.b@googlemail.com')).toBe('ab@gmail.com'));
});
