import { Router } from 'express';
import {
    QRGenerator
} from '../controllers/QR_controller.js';

const router = Router();

router.put('/:screeningId/:seatId/qr', QRGenerator);

export default router;