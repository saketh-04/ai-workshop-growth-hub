import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { asyncHandler } from '../utils/asyncHandler';

export const login = (auth: AuthService) =>
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await auth.login(req.body.email, req.body.password));
  });

export const me = (_req: Request, res: Response) => {
  res.json({ admin: res.locals.admin });
};
