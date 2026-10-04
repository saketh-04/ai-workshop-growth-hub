import { RequestHandler } from 'express';
import { AuthService } from '../services/authService';
import { AppError } from '../utils/errors';

export const authenticateAdmin =
  (auth: AuthService): RequestHandler =>
  (req, res, next) => {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Missing bearer token'));
    }
    try {
      res.locals.admin = auth.verify(token);
      next();
    } catch (err) {
      next(err);
    }
  };
