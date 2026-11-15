import { Router } from 'express';
import {
    getSeatsInfoFromScreening,
    reserveSeat,
    releaseSeat,
    cancelOwnReservation
} from '../controllers/seats_controller.js';

const router = Router();

router.get('/:screeningId', getSeatsInfoFromScreening);
router.delete('/:screeningId/reservation', cancelOwnReservation);
router.post('/:screeningId/reservation/:seatId', reserveSeat);
router.delete('/:screeningId/reservation/:seatId', releaseSeat);

export default router;
