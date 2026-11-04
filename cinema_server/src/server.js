import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

import { initializeDatabasePool, closeDatabasePool } from './database/database.js';
import movieRoutes from './movie_module/routes/movie_routes.js';
import genreRoutes from './movie_module/routes/genre_routes.js';
import languageRoutes from './movie_module/routes/language_routes.js';
import ratingRoutes from './movie_module/routes/rating_routes.js';
import audiovisualFormatRoutes from './movie_module/routes/audiovisual_format_routes.js';
import directorRoutes from './movie_module/routes/director_routes.js';
import discountRoutes from './discount_module/routes/discount_routes.js';
import feeRoutes from './fee_module/routes/fee_routes.js';
import billboardRoutes from './billboard_module/routes/billboard_routes.js';
import purchaseRoutes from './purchase_module/routes/purchase_routes.js';
import userRoutes from './user_module/routes/user_routes.js';
import locationRoutes from './location_module/routes/location_routes.js';
import { globalErrorHandler } from './middleware/errorHandler.js';
import clientRoutes from './client_module/routes/client_routes.js';
import authRoutes from './auth_module/routes/auth_routes.js';
import seatsRoutes from './seats_module/routes/seats_routes.js';
import QR_routes from './QR_module/routes/QR_routes.js';

dotenv.config();

const port = 3000;
const ip = '0.0.0.0';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Route for poster images
app.use('/posters', express.static(path.join(process.cwd(), 'uploads', 'posters')));
app.use('/posters', (req, res, next) => {
  next({
    status: 404,
    code: 'NOT_FOUND',
    message: 'El póster solicitado no existe.',
    path: req.originalUrl,
  });
});

//Mount routes in the app
app.use('/auth', authRoutes);
app.use('/clients', clientRoutes);
app.use('/billboard', billboardRoutes);
app.use('/purchases', purchaseRoutes);
app.use('/management/movies', movieRoutes);
app.use('/management/genres', genreRoutes);
app.use('/management/languages', languageRoutes);
app.use('/management/ratings', ratingRoutes);
app.use('/management/audiovisual_format', audiovisualFormatRoutes);
app.use('/management/directors', directorRoutes);
app.use('/management/discounts', discountRoutes);
app.use('/management/fees', feeRoutes);
app.use('/management/users', userRoutes);
app.use('/management/locations', locationRoutes);
app.use('/seats', seatsRoutes);
app.use('/purchase', QR_routes);

// Route not found
app.use((req, res, next) => {
  next({
    status: 404,
    code: 'NOT_FOUND',
    message: 'La ruta solicitada no existe.',
    path: req.originalUrl,
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error(error);

  const status = error.status || 500;

  res.status(status).json({
    message:
      status === 500
        ? 'No fue posible completar la operación.'
        : error.message,
  });
});
app.use(globalErrorHandler);

async function startServer() {
  await initializeDatabasePool();

  const server = app.listen(port, ip, () => {
    console.log(`Server running on port ${port} IP ${ip}`);
  });

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
} catch (error) {
  console.error("Unable to start the server: ", error);
  process.exit(1);
}
