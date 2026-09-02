/**
 * Error carrying an HTTP status. `isOperational` distinguishes expected
 * failures (validation, auth) from bugs, which are never echoed to clients.
 */
export class ApiError extends Error {
  constructor(statusCode, message, { details = null, isOperational = true, cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details) {
    return new ApiError(400, message, { details });
  }

  static unauthorized(message = 'Authentication required', details) {
    return new ApiError(401, message, { details });
  }

  static forbidden(message = 'You do not have permission to perform this action', details) {
    return new ApiError(403, message, { details });
  }

  static notFound(message = 'Resource not found', details) {
    return new ApiError(404, message, { details });
  }

  static conflict(message = 'Resource already exists', details) {
    return new ApiError(409, message, { details });
  }

  static tooManyRequests(message = 'Too many requests', details) {
    return new ApiError(429, message, { details });
  }

  static internal(message = 'Something went wrong', details) {
    return new ApiError(500, message, { details, isOperational: false });
  }
}

export default ApiError;
