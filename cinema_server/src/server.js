import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { initializeDatabasePool, closeDatabasePool } from './database/database.js';
import discountRoutes from './discount_module/routes/discount_routes.js';

dotenv.config();

const port = 3000;
const ip = '0.0.0.0';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

//Mount routes in the app
app.use('/management/discounts', discountRoutes);

// Router not found
app.use((req, res, next) => {
  next({ status: 404, code: 'NOT_FOUND', message: 'La ruta solicitada no existe.' });
});


async function startServer() {
  await initializeDatabasePool();

  const server = app.listen(port, ip, () => {
    console.log(`Server running on port ${port} IP ${ip}`);
  })

  process.on('SIGINT', async () => {
    console.log("Closing server and database pool");
    server.close(async () => {
      await closeDatabasePool();
      process.exit(0);
    });
  });
}

try {
  await startServer();
} catch(error) {
  console.error("Unable to start the server: ", error);
  process.exit(1);
}