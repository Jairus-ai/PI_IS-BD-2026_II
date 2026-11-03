import { Router } from 'express';
import { getUsersList, deactivateWorker, createUser } from '../controllers/user_controller.js';
import { requireSession, ROLES } from '../../session/session.js';

const router = Router();

router.get(
    '/',
    requireSession([
        ROLES.SUPERUSER,
        ROLES.ADMINISTRATOR,
        ROLES.EMPLOYEE,
    ]),
    getUsersList
);

router.patch(
    '/:id/deactivate',
    requireSession([
        ROLES.SUPERUSER,
        ROLES.ADMINISTRATOR,
    ]),
    deactivateWorker
);

router.post(
  '/',
  requireSession([
    ROLES.SUPERUSER,
    ROLES.ADMINISTRATOR,
    ROLES.EMPLOYEE,
  ]),
  createUser
);

export default router;