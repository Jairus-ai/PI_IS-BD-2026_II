import dotenv from 'dotenv';
import { initDB } from './src/database/db.js';

dotenv.config();

async function run () {
    initDB();
}

run();
