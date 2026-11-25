import { Router } from 'express';
import {
  clearRoomStatus,
  getRoomDashboard,
  getRoomDashboardFilters,
  setRoomStatus
} from '../controllers/room_dashboard_controller.js';
import { ROLES, requireSession } from '../../session/session.js';

const DASHBOARD_ROLES = [ROLES.SUPERUSER, ROLES.ADMINISTRATOR, ROLES.EMPLOYEE];

const router = Router();

router.use(requireSession(DASHBOARD_ROLES));
router.get('/filters', getRoomDashboardFilters);
router.get('/rooms/:roomId', getRoomDashboard);
router.put('/rooms/:roomId/status', setRoomStatus);
router.delete('/rooms/:roomId/status', clearRoomStatus);

export default router;