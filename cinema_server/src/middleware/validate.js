export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);

  if (!result.success) {
    return next({
      status: 400,
      code: 'INVALID_QUERY_PARAMS',
      message: 'Los parámetros de búsqueda no son válidos.',
      details: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  req.query = result.data;
  next();
};
