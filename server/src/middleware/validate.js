import { ApiError } from '../utils/ApiError.js';

/**
 * Validates request parts against Zod schemas and replaces them with the parsed
 * (coerced, stripped) values. Usage:
 *   router.post('/', validate({ body: createSchema }), controller)
 *
 * Express 5 makes `req.query` a getter, so parsed query values are exposed on
 * `req.validatedQuery` instead of overwriting `req.query`.
 */
export function validate(schemas) {
  return (req, _res, next) => {
    const issues = [];

    for (const part of ['params', 'query', 'body']) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part] ?? {});
      if (!result.success) {
        for (const issue of result.error.issues) {
          issues.push({ location: part, path: issue.path.join('.'), message: issue.message });
        }
        continue;
      }

      if (part === 'query') req.validatedQuery = result.data;
      else req[part] = result.data;
    }

    if (issues.length > 0) {
      return next(new ApiError(422, 'Some fields are invalid', { details: issues }));
    }
    return next();
  };
}
