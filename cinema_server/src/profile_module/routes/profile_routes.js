import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profile_controller.js';
import { requireSession } from '../../session/session.js';

const router = Router();

//every role has a profile
router.use(requireSession());
router.get('/', getProfile);
router.put('/', updateProfile);

export default router;
