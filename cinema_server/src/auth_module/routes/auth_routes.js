import { Router } from 'express';
import { changePassword, getCurrentUser, logIn, logOut } from '../controllers/auth_controller.js';
import { requireSession } from '../../session/session.js';

const router = Router();

router.post('/login', logIn);
router.post('/logout', logOut);
router.get('/me', requireSession(), getCurrentUser);
router.patch('/change-password', requireSession(), changePassword);

export default router;
