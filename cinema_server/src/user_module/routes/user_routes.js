import { Router } from 'express';
import { getUsersList, deactivateWorker } from '../controllers/user_controller.js';

const router = Router();

router.get('/', getUsersList);
router.patch('/:id/deactivate', deactivateWorker);

export default router;