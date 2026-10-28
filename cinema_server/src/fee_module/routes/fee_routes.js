import { Router } from 'express';
import { getFeeList } from '../controllers/fee_controller.js';
import { ROLES, requireSession } from '../../session/session.js';

const FEE_MANAGER_ROLES = [ROLES.SUPERUSER, ROLES.ADMINISTRATOR];

const router = Router();

router.use(requireSession(FEE_MANAGER_ROLES));
router.get('/', getFeeList);

export default router;
