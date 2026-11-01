import { Router } from 'express';
import { changePassword, getCurrentUser, logIn, logOut } from '../controllers/auth_controller.js';
import { requireSession } from '../../session/session.js';
import { requestPasswordRecovery,} from '../controllers/password_recovery_controller.js';

const router = Router();

router.post('/login', logIn);
router.post('/logout', logOut);
router.get('/me', requireSession(), getCurrentUser);
router.patch('/change-password', requireSession(), changePassword);
router.post('/password-recovery/request', requestPasswordRecovery);

export default router;
