import { Router } from 'express';
import {
  getMoviesCount,
  getMoviesList,
  getMovieByID,
  getMovieOptions,
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
import { requireSession, ROLES } from '../../session/session.js';

const MOVIE_BODY_ERROR_MESSAGE = 'Los datos de la película no son validos.';

const MOVIE_MANAGER_ROLES = [
  ROLES.SUPERUSER,
  ROLES.ADMINISTRATOR
];

const requireMovieManager = requireSession(MOVIE_MANAGER_ROLES);

const router = Router();

router.get('/', validateQuery(movieQuerySchema), getMoviesList);
router.get('/count', validateQuery(movieQuerySchema), getMoviesCount);
router.get('/options', getMovieOptions);
router.get('/:id', validateParams(movieIdSchema), getMovieByID);
router.post('/poster', requireMovieManager, uploadPoster.single('poster'), uploadPosterFile);
router.post('/', requireMovieManager, validateBody(movieBodySchema, MOVIE_BODY_ERROR_MESSAGE), createMovie);
router.put('/:id', requireMovieManager, validateParams(movieIdSchema), validateBody(movieBodyPartialSchema, MOVIE_BODY_ERROR_MESSAGE), updateMovie);
router.delete('/:id', requireMovieManager, validateParams(movieIdSchema), deleteMovie);

export default router;