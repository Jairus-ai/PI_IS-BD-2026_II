import { Router } from 'express';
import { addFee, deactivateFee, getFeeList, updateFee } from '../controllers/fee_controller.js';
import { ROLES, requireSession } from '../../session/session.js';

const FEE_MANAGER_ROLES = [ROLES.SUPERUSER, ROLES.ADMINISTRATOR];

const router = Router();

router.use(requireSession(FEE_MANAGER_ROLES));
router.get('/', getFeeList);
router.post('/', addFee);
router.put('/:id', updateFee);
router.patch('/:id/deactivate', deactivateFee);

export default router;
