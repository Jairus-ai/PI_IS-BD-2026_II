import dotenv from 'dotenv';
import { initializeDatabasePool, closeDatabasePool } from './src/database/database.js';

dotenv.config();

async function startServer() {
  await initializeDatabasePool();
  closeDatabasePool();
}

startServer();
