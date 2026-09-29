import { Router } from 'express';
import {
  getMoviesCount,
  getMoviesList,
  getMovieByID
} from '../controllers/movie_controller.js';

const router = Router();

router.get('/count', getMoviesCount);
router.get('/', getMoviesList);
router.get('/:id', getMovieByID);

export default router;