import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { initializeDatabasePool, closeDatabasePool } from './src/database/database.js';
import userRoutes from './src/user_module/routes/user_routes.js';
import locationRoutes from './src/location_module/routes/location_routes.js';

dotenv.config();

const port = 3000;

const app = express();
app.disable('x-powered-by');
app.use(cors({oring: 'http://localhost:5173', credentials: true}));
app.use(express.json());

app.use('/management/users', userRoutes);
app.use('/management/locations', locationRoutes);
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
