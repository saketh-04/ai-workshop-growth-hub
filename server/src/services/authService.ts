import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Env } from '../config/env';
import { AppError } from '../utils/errors';

export interface AuthConfig {
  adminEmail: string;
  passwordHash: string;
  jwtSecret: string;
  expiresIn: string;
}

/** Uses a ready bcrypt hash if provided, otherwise hashes ADMIN_PASSWORD once at boot. */
export async function resolvePasswordHash(env: Pick<Env, 'ADMIN_PASSWORD' | 'ADMIN_PASSWORD_HASH'>): Promise<string> {
  return env.ADMIN_PASSWORD_HASH ?? bcrypt.hash(env.ADMIN_PASSWORD as string, 12);
}

export function createAuthService(cfg: AuthConfig) {
  return {
    async login(email: string, password: string): Promise<{ token: string }> {
      // Always run the bcrypt compare so response time doesn't reveal whether the email was right.
      const passwordOk = await bcrypt.compare(password, cfg.passwordHash);
      const emailOk = email.trim().toLowerCase() === cfg.adminEmail.toLowerCase();
      if (!emailOk || !passwordOk) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

      const token = jwt.sign({ role: 'admin', email: cfg.adminEmail }, cfg.jwtSecret, {
        algorithm: 'HS256',
        expiresIn: cfg.expiresIn as jwt.SignOptions['expiresIn'],
      });
      return { token };
    },

    verify(token: string): { email: string } {
      try {
        const payload = jwt.verify(token, cfg.jwtSecret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
        if (payload.role !== 'admin') throw new Error('not admin');
        return { email: String(payload.email) };
      } catch {
        throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired token');
      }
    },
  };
}
export type AuthService = ReturnType<typeof createAuthService>;
