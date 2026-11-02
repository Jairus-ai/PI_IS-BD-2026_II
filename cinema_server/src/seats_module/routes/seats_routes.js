import { Router } from 'express';
import {
    getSeatsInfoFromScreening,
    markSeatAsUnavailable,
    markSeatAsAvailable
} from '../controllers/seats_controller.js';

const router = Router();

router.get('/:screeningId', getSeatsInfoFromScreening);
router.put('/:screeningId/:seatId/unavailable', markSeatAsUnavailable);
router.put('/:screeningId/:seatId/available', markSeatAsAvailable);

export default router;