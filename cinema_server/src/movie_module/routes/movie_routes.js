import { Router } from 'express';
import {
  getMoviesCount,
  getMoviesList,
  getMovieByID,
} from '../controllers/movie_controller.js';
import { uploadPosterFile } from '../controllers/poster_controller.js';
import { z } from 'zod';
import { validateQuery } from '../../middleware/validate.js';
import { validateParams } from '../../middleware/validate.js';
import { uploadPoster } from '../../middleware/upload.js';

const router = Router();

const movieQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  genreId: z.coerce.number().int().positive().optional(),
  languageCode: z.string().min(2).max(3).optional(),
  directorId: z.coerce.number().int().positive().optional(),
  audiovisualFormatId: z.coerce.number().int().positive().optional(),
});
const movieIdSchema = z.object({ id: z.coerce.number().int().positive() });

router.get('/', validateQuery(movieQuerySchema), getMoviesList);
router.get('/count', validateQuery(movieQuerySchema), getMoviesCount);
router.get('/:id', validateParams(movieIdSchema), getMovieByID);
router.post('/poster', uploadPoster.single('poster'), uploadPosterFile);

export default router;