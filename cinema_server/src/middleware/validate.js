const makeValidator = (source, target, code, message) => (schema) => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    return next({
      status: 400,
      code,
      message,
      details: result.error.issues,
    });
  }

  if (source === 'params') {
    for (const k of Object.keys(req.params)) delete req.params[k];
    Object.assign(req.params, result.data);
  }
  req[target] = result.data;
  next();
};

export const validateQuery = makeValidator('query', 'validatedQuery', 'INVALID_QUERY_PARAMS', 'Los parámetros de búsqueda no son validos.');

export const validateParams = makeValidator('params', 'validatedParams', 'INVALID_PATH_PARAMS', 'El ID no es valido.');

export const validateBody = makeValidator('body', 'validatedBody', 'INVALID_BODY', 'Los datos de la película no son validos.');
