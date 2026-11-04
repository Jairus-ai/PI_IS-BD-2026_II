import { Router } from 'express';
import {
    QRController
} from '../controllers/QR_controller.js';

const router = Router(); 

router.post('/qr/:idUser', QRController);

export default router;
  