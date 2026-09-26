import express from 'express';
import dotenv from 'dotenv';
import { initializeDatabasePool, closeDatabasePool } from './src/database/database.js';

dotenv.config();

const port = 3000;

const app = express();
app.disable('x-powered-by');

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
