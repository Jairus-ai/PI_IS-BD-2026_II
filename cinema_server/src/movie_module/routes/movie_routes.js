import { Router } from 'express';
import {
  getMoviesCount,
  getMoviesList,
  getMovieByID,
  createMovie,
  updateMovie,
  deleteMovie
} from '../controllers/movie_controller.js';
import { uploadPosterFile } from '../controllers/poster_controller.js';
import { validateQuery, validateParams, validateBody } from '../../middleware/validate.js';
import { uploadPoster } from '../../middleware/upload.js';
import {
  movieQuerySchema,
  movieIdSchema,
  movieBodySchema,
  movieBodyPartialSchema,
} from '../schemas/movieSchema.js'

const MOVIE_BODY_ERROR_MESSAGE = 'Los datos de la película no son validos.';

const router = Router();

router.get('/', validateQuery(movieQuerySchema), getMoviesList);
router.get('/count', validateQuery(movieQuerySchema), getMoviesCount);
router.get('/:id', validateParams(movieIdSchema), getMovieByID);
router.post('/poster', uploadPoster.single('poster'), uploadPosterFile);
router.post('/', validateBody(movieBodySchema, MOVIE_BODY_ERROR_MESSAGE), createMovie);
router.put('/:id', validateParams(movieIdSchema), validateBody(movieBodyPartialSchema, MOVIE_BODY_ERROR_MESSAGE), updateMovie);
router.delete('/:id', validateParams(movieIdSchema), deleteMovie);

export default router;