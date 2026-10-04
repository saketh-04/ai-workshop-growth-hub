import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createAuthService } from '../../src/services/authService';

const SECRET = 'x'.repeat(40);
let auth: ReturnType<typeof createAuthService>;
beforeAll(async () => {
  auth = createAuthService({
    adminEmail: 'admin@example.com',
    passwordHash: await bcrypt.hash('correct-horse-battery', 4), // low cost = fast tests
    jwtSecret: SECRET,
    expiresIn: '1h',
  });
});

describe('admin auth', () => {
  it('issues a token for correct credentials (email is case-insensitive)', async () => {
    const { token } = await auth.login(' ADMIN@example.com ', 'correct-horse-battery');
    expect(auth.verify(token)).toEqual({ email: 'admin@example.com' });
  });
  it('rejects a wrong password with 401', async () =>
    await expect(auth.login('admin@example.com', 'nope')).rejects.toMatchObject({ status: 401 }));
  it('rejects a wrong email with 401', async () =>
    await expect(auth.login('other@example.com', 'correct-horse-battery')).rejects.toMatchObject({ status: 401 }));
  it('rejects a token signed with a different secret', () => {
    const forged = jwt.sign({ role: 'admin', email: 'admin@example.com' }, 'y'.repeat(40));
    expect(() => auth.verify(forged)).toThrow();
  });
  it('rejects a valid token that is not an admin token', () => {
    const t = jwt.sign({ role: 'student' }, SECRET);
    expect(() => auth.verify(t)).toThrow();
  });
  it('rejects an expired token', () => {
    const t = jwt.sign({ role: 'admin', email: 'a@b.co' }, SECRET, { expiresIn: -10 });
    expect(() => auth.verify(t)).toThrow();
  });
  it('rejects an unsigned (alg: none) token', () => {
    const none = Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url') + '.' +
      Buffer.from('{"role":"admin"}').toString('base64url') + '.';
    expect(() => auth.verify(none)).toThrow();
  });
});
