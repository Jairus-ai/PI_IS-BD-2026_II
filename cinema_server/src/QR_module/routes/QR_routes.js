import { Router } from 'express';
import {
    QRController
} from '../controllers/QR_controller.js';

const router = Router();

router.post('/qr/:idUser', QRController);

export default router;

/*curl -i -X POST http://localhost:3000/purchase/qr/24 \
  -H "Content-Type: application/json" \
  -d '{"data":[{"screeningId":2,"seatId":22},{"screeningId":2,"seatId":21}]}'*/
  