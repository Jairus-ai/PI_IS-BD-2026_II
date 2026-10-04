export const globalErrorHandler = (err, req, res, next) => {
  const requestId = req.id || 'N/A';

  console.error(`[ERROR] [ID: ${requestId}] Message: ${err.message}`);

  if (err.offset !== undefined || (err.message && err.message.includes('ORA-'))) {
    console.error(`[ORACLE ERROR] [ID: ${requestId}] Code: ${err.num || 'ORA-X'}, Pos ${err.offset}`);
  }

  if (err.stack) {
    console.error(`[STACK TRACE] [ID: ${requestId}]\n${err.stack}`);
  }

  const statusCode = err.status || err.statusCode || 500;

  const responsePayload = {
    success: false,
    requestId: requestId,
    error: {
      code: err.code || (err.message && err.message.includes('ORA-') ? 'DATABASE_ERROR' : 'INTERNAL_SERVER_ERROR'),
      message: err.message || 'Ocurrió un error inesperado en el servidor.',
      ...(err.details && { details: err.details }),
    },
  };

  res.status(statusCode).json(responsePayload);
}