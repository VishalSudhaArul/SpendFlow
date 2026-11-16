/**
 * An error that is safe to show to API clients.
 * Anything thrown that is NOT an ApiError is treated as an internal error and
 * its message is hidden from the response.
 */
export class ApiError extends Error {
  constructor(statusCode, message, { code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code ?? defaultCode(statusCode);
    this.details = details;
  }

  static badRequest(message = 'Bad request', details) {
    return new ApiError(400, message, { details });
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You do not have access to this resource') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Resource already exists') {
    return new ApiError(409, message);
  }
}

function defaultCode(statusCode) {
  const codes = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMITED',
    503: 'SERVICE_UNAVAILABLE',
  };
  return codes[statusCode] ?? (statusCode >= 500 ? 'INTERNAL_ERROR' : 'ERROR');
}
