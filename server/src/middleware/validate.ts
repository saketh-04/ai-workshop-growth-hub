import { RequestHandler } from 'express';
import { ZodTypeAny } from 'zod';

/** Parses + replaces req.body/params/query with the validated (trimmed, typed) data. ZodError -> 400 via errorHandler. */
export const validate =
  (schema: ZodTypeAny, source: 'body' | 'params' | 'query' = 'body'): RequestHandler =>
  (req, _res, next) => {
    try {
      (req as unknown as Record<string, unknown>)[source] = schema.parse(req[source]);
      next();
    } catch (err) {
      next(err);
    }
  };
