import { Router } from 'express';
import { getUsersList } from '../controllers/user_controller.js';

const router = Router();

router.get('/', getUsersList);

export default router;