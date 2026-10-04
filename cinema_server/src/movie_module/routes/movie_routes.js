import { Router } from 'express';
import {
  getMoviesCount,
  getMoviesList,
  getMovieByID
} from '../controllers/movie_controller.js';
import { z } from 'zod';
import { validateQuery } from '../../middleware/validate.js';

const router = Router();

const movieQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? Number(val) : 1)),
  genreId: z.string().optional().transform((val) => (val ? Number(val) : undefined)),
  languageCode: z.string().optional(),
  directorId: z.string().optional().transform((val) => (val ? Number(val) : undefined)),
  audiovisualFormatId: z.string().optional().transform((val) => (val ? Number(val) : undefined)),
});

router.get('/', validateQuery(movieQuerySchema), getMoviesList);
router.get('/count', validateQuery(movieQuerySchema), getMoviesCount);
router.get('/:id', getMovieByID);

export default router;