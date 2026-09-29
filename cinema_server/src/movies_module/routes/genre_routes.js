import { Router } from 'express';
import { getGenreList } from '../controllers/genre_controller.js';

const router = Router();

router.get('/', getGenreList);

export default router;