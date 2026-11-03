import { Router } from 'express';
import { getPurchaseHistory, getPurchaseDetail } from '../controllers/purchase_controller.js';
import { ROLES, requireSession } from '../../session/session.js';

const router = Router();

router.use(requireSession([ROLES.CLIENT]));
router.get('/', getPurchaseHistory);
router.get('/:id', getPurchaseDetail);

export default router;
