import { ZodError } from 'zod';
export const httpError = (status, message) => Object.assign(new Error(message), { status });
export function notFound(req, res) { res.status(404).json({ error: 'Not found' }); }
// Express identifies error middleware by its four parameters.
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) return res.status(400).json({
    error: 'Validation failed',
    details: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  });
  if (err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
