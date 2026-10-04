export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);

  if (!result.success) {
    return next({
      status: 400,
      code: 'INVALID_QUERY_PARAMS',
      message: 'Los parámetros de búsqueda no son válidos.',
      details: result.error.issues,
    });
  }

  req.validatedQuery = result.data;
  next();
};

export const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);

  if (!result.success) {
    return next({
      status: 400,
      code: 'INVALID_PATH_PARAMS',
      message: 'El ID no es válido.',
      details: result.error.issues,
    });
  }

  for (const k of Object.keys(req.params)) delete req.params[k];
  Object.assign(req.params, result.data);
  next();
};