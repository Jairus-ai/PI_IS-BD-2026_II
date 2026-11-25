import { Router } from 'express';
import { addScreen, getScreenList, getScreenLocations } from '../controllers/screen_controller.js';
import { ROLES, requireSession } from '../../session/session.js';

const SCREEN_MANAGER_ROLES = [ROLES.SUPERUSER, ROLES.ADMINISTRATOR];
const router = Router();

router.use(requireSession(SCREEN_MANAGER_ROLES));
router.get('/', getScreenList);
router.get('/locations', getScreenLocations);
router.post('/', addScreen);

export default router;
