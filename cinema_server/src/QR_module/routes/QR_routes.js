import { Router } from 'express';
import {
    QRGenerator
} from '../controllers/QR_controller.js';

const router = Router();

router.get('/:screeningId/:seatId/qr', QRGenerator);

export default router;