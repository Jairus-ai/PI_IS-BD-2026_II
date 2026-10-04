import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { initializeDatabasePool, closeDatabasePool } from './src/database/database.js';
import userRoutes from './src/user_module/routes/user_routes.js';

dotenv.config();

const port = 3000;

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json());

app.use('/management/users', userRoutes);
app.use((error, req, res, next) => {
  console.error(error);

  const status = error.status || 500;

  res.status(status).json({
    message:
      status === 500
        ? 'No fue posible cargar la información de los usuarios.'
        : error.message,
  });
});

async function startServer() {
  await initializeDatabasePool();

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
