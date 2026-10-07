import { Router } from 'express';
import { getCurrentUser, logIn, logOut } from '../controllers/auth_controller.js';
import { requireSession } from '../../session/session.js';

const router = Router();

router.post('/login', logIn);
router.post('/logout', logOut);
router.get('/me', requireSession(), getCurrentUser);

export default router;
