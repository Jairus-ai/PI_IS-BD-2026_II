/* Meant to help track the HTTP request to facilitate debugging.
 * Also increases visibility of the inner working of the server.
 */
import { v4 as uuidv4 } from 'uuid';

export const requestTracker = (req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);

  const startTime = Date.now();

  console.log( `[REQ] [ID: ${req.id}] ${req.method} ${req.originalUrl} `);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log( `[RES] [ID: ${req.id}] Status: ${res.statusCode} (${duration}ms) `);
  });

  next();
};