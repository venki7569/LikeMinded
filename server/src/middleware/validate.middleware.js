import ApiError from '../utils/ApiError.js';

/**
 * Validates and replaces `req.body`/`req.query`/`req.params` with the parsed
 * result, so controllers only ever see coerced, whitelisted values.
 *
 * @param {{body?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, params?: import('zod').ZodTypeAny}} schemas
 */
export function validate(schemas) {
  return (req, _res, next) => {
    const issues = [];

    for (const source of ['body', 'query', 'params']) {
      const schema = schemas[source];
      if (!schema) continue;

      const result = schema.safeParse(req[source]);
      if (result.success) {
        req[source] = result.data;
      } else {
        issues.push(
          ...result.error.issues.map((issue) => ({
            field: [source, ...issue.path].join('.'),
            message: issue.message,
          }))
        );
      }
    }

    if (issues.length > 0) {
      return next(ApiError.badRequest('Validation failed', issues));
    }

    return next();
  };
}

export default validate;
