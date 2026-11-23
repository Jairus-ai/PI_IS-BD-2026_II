import { Router } from 'express';
import {
  getMoviesInBillboardsCount,
  getMoviesInBillboardsList,
  getMovieInBillboardByID,
  createMovieInBillboard,
  updateMovieInBillboard
} from '../controllers/movie_in_billboard_controller.js';
import {
  validateQuery,
  validateParams,
  validateBody
} from '../../middleware/validate.js';
import {
  movieInBillboardQuerySchema,
  movieInBillboardIdSchema,
  movieInBillboardBodySchema
} from '../schemas/movie_in_billboard_schema.js';
import {
  ROLES,
  requireSession
} from '../../session/session.js';

const MOVIE_IN_BILLBOARD_ACCESS_ROLES = [
  ROLES.SUPERUSER,
  ROLES.ADMINISTRATOR
];

const router = Router();

router.use(requireSession(MOVIE_IN_BILLBOARD_ACCESS_ROLES));
router.get('/', validateQuery(movieInBillboardQuerySchema), getMoviesInBillboardsList);
router.get('/count', validateQuery(movieInBillboardQuerySchema), getMoviesInBillboardsCount);
router.get('/:id', validateParams(movieInBillboardIdSchema), getMovieInBillboardByID);
router.post('/', validateBody(movieInBillboardBodySchema), createMovieInBillboard);
router.put('/:id', validateParams(movieInBillboardIdSchema), validateBody(movieInBillboardBodySchema), updateMovieInBillboard);

export default router;
