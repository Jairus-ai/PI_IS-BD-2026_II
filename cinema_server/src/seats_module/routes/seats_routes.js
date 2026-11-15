import { Router } from 'express';
import {
    getSeatsInfoFromScreening,
    reserveSeat,
    releaseSeat,
    cancelOwnReservation
    reserveSeat,
    releaseSeat,
    cancelOwnReservation
} from '../controllers/seats_controller.js';
import {
    ROLES,
    readSessionToken
} from '../../session/session.js';

const CLIENTS_ONLY_MESSAGE = 'Solo los clientes pueden reservar asientos';

const router = Router();

function rejectWorkers(req, res, next) {
    const session = readSessionToken(req);

    if (session && session.role !== ROLES.CLIENT)
        return res.status(403).json({ message: CLIENTS_ONLY_MESSAGE });

    next();
}

router.get('/:screeningId', getSeatsInfoFromScreening);
router.delete('/:screeningId/reservation', cancelOwnReservation);
router.post('/:screeningId/reservation/:seatId', reserveSeat);
router.delete('/:screeningId/reservation/:seatId', releaseSeat);

export default router;

