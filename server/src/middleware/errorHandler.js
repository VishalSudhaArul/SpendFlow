import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl.split('?')[0]}`));
}

/**
 * Converts any thrown error into the standard error response.
 * Internal error messages and stack traces are never sent to the client.
 * Express identifies error handlers by their 4 arguments, so `_next` must stay.
 */
export function errorHandler(err, req, res, _next) {
  const normalized = normalizeError(err);

  if (normalized.statusCode >= 500 && !env.isTest) {
    // Log the error name/message/stack only — never request bodies or headers,
    // which may contain passwords or tokens.
    console.error(`[error] ${req.method} ${req.originalUrl.split('?')[0]} ->`, err?.stack ?? err);
  }

  const body = {
    success: false,
    error: {
      code: normalized.code,
      message: normalized.message,
    },
  };
  if (normalized.details) body.error.details = normalized.details;

  res.status(normalized.statusCode).json(body);
}

function normalizeError(err) {
  if (err instanceof ApiError) return err;

  // Malformed JSON body (thrown by express.json()).
  if (err?.type === 'entity.parse.failed') {
    return ApiError.badRequest('Request body is not valid JSON');
  }
  if (err?.type === 'entity.too.large') {
    return new ApiError(413, 'Request body is too large', { code: 'PAYLOAD_TOO_LARGE' });
  }

  // Mongoose errors (models arrive in later phases).
  if (err?.name === 'CastError') {
    return ApiError.badRequest(`Invalid value for ${err.path}`);
  }
  if (err?.name === 'ValidationError' && err.errors) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    return new ApiError(422, 'Some fields are invalid', { details });
  }
  if (err?.code === 11000) {
    const fields = Object.keys(err.keyPattern ?? {}).join(', ');
    return ApiError.conflict(fields ? `A record with this ${fields} already exists` : undefined);
  }

  return new ApiError(500, 'Something went wrong on our side. Please try again.');
}
