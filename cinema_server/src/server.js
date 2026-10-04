import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import { initializeDatabasePool, closeDatabasePool } from './database/database.js';
import movieRoutes from './movie_module/routes/movie_routes.js';
import genreRoutes from './movie_module/routes/genre_routes.js';
import languageRoutes from './movie_module/routes/language_routes.js';
import ratingRoutes from './movie_module/routes/rating_routes.js';
import audiovisualFormatRoutes from './movie_module/routes/audiovisual_format_routes.js';
import discountRoutes from './discount_module/routes/discount_routes.js';
import cors from 'cors';

dotenv.config();

const port = 3000;
const ip = '0.0.0.0';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use(requestTracker);

// Mount routes in the app
app.use('/management/movies', movieRoutes);
app.use('/management/genres', genreRoutes);
app.use('/management/languages', languageRoutes);
app.use('/management/ratings', ratingRoutes);
app.use('/management/audiovisual_format', audiovisualFormatRoutes);
app.use('/management/discounts', discountRoutes);

// Router not found
app.use((req, res, next) => {
  next({ status: 404, code: 'NOT_FOUND', message: 'La ruta solicitada no existe.' });
});

app.use(globalErrorHandler);

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
