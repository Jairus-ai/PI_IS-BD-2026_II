import { Router } from 'express';
import { registerClient } from '../controllers/client_controller.js';

const router = Router();

router.post('/register', registerClient);

export default router;
