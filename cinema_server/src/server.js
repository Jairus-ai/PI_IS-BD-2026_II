import express from 'express';
import dotenv from 'dotenv';

import { initializeDatabasePool, closeDatabasePool } from './database/database.js';
import moviesRoutes from './movies_module/routes/movie_routes.js';
import genresRoutes from './movies_module/routes/genre_routes.js';

dotenv.config();

const port = 3000;

const app = express();
app.disable('x-powered-by');
app.use(express.json());

// Mount routes in the app
app.use('/management/movies', moviesRoutes);
app.use('/management/genres', moviesRoutes);

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
