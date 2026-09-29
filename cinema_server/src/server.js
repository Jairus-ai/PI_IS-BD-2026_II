import express from 'express';
import dotenv from 'dotenv';

import { initializeDatabasePool, closeDatabasePool } from './database/database.js';
import movieRoutes from './movies_module/routes/movie_routes.js';
import genreRoutes from './movies_module/routes/genre_routes.js';
import languageRoutes from './movies_module/routes/movie_routes.js';
import ratingRoutes from './movies_module/routes/rating_routes.js';
import audiovisualFormatRoutes from './movies_module/routes/audiovisual_format_routes.js';

dotenv.config();

const port = 3000;

const app = express();
app.disable('x-powered-by');
app.use(express.json());

// Mount routes in the app
app.use('/management/movies', movieRoutes);
app.use('/management/genres', genreRoutes);
app.use('/management/languages', languageRoutes);
app.use('/management/ratings', ratingRoutes);
app.use('/management/audiovisual_format', audiovisualFormatRoutes);

async function startServer() {
  initializeDatabasePool();

  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
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
