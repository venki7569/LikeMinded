import mongoose from 'mongoose';
import env from '../config/env.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist`));
}

/** Maps known driver/library errors onto ApiError so responses stay uniform. */
function normalizeError(error) {
  if (error instanceof ApiError) return error;

  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.values(error.errors).map((issue) => ({
      field: issue.path,
      message: issue.message,
    }));
    return ApiError.badRequest('Validation failed', details);
  }

  if (error instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid value for ${error.path}`);
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern ?? {})[0] ?? 'field';
    return ApiError.conflict(`That ${field} is already taken`, [{ field, message: `That ${field} is already taken` }]);
  }

  if (error.type === 'entity.too.large') {
    return new ApiError(413, 'Request payload is too large');
  }

  if (error.type === 'entity.parse.failed') {
    return ApiError.badRequest('Request body is not valid JSON');
  }

  return new ApiError(error.statusCode ?? 500, error.message ?? 'Something went wrong', {
    isOperational: false,
    cause: error,
  });
}

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
export function errorHandler(error, req, res, next) {
  const apiError = normalizeError(error);

  if (!apiError.isOperational || apiError.statusCode >= 500) {
    logger.error(apiError.message, {
      method: req.method,
      url: req.originalUrl,
      stack: apiError.stack,
    });
  } else {
    logger.warn(apiError.message, { method: req.method, url: req.originalUrl });
  }

  const body = {
    success: false,
    message:
      apiError.statusCode >= 500 && env.isProduction ? 'Something went wrong' : apiError.message,
  };

  if (apiError.details) body.errors = apiError.details;
  if (!env.isProduction && apiError.statusCode >= 500) body.stack = apiError.stack;

  res.status(apiError.statusCode).json(body);
}

export default errorHandler;
