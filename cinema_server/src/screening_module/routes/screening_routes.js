import { Router } from 'express';
import {
  getScreeningsCount,
  getScreeningsList,
  getScreeningByID
} from '../controllers/screening_controller.js';
import {
  validateQuery,
  validateParams
} from '../../middleware/validate.js';
import {
  screeningQuerySchema,
  screeningIdSchema
} from '../schemas/screening_schema.js';
import {
  WORKER_ROLES_BY_CODE,
  requireSession
} from '../../session/session.js';

const SCREENING_ACCESS_ROLES = Object.values(WORKER_ROLES_BY_CODE);

const router = Router();

router.use(requireSession(SCREENING_ACCESS_ROLES));
router.get('/', validateQuery(screeningQuerySchema), getScreeningsList);
router.get('/count', validateQuery(screeningQuerySchema), getScreeningsCount);
router.get('/:id', validateParams(screeningIdSchema), getScreeningByID);

export default router;
