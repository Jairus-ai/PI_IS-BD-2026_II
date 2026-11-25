import { Router } from 'express';
import {
  createPaymentIntent,
  getPaymentReservation,
  getPaymentStatus,
  getPaymentSummary
} from '../controllers/payment_controller.js';
import {
  ROLES,
  requireSession
} from '../../session/session.js';

const router = Router();

router.use(requireSession([ROLES.CLIENT]));
//reservation and payment data change so the browser must always ask the server
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
router.get('/reservation', getPaymentReservation);
router.get('/summary', getPaymentSummary);
router.post('/intent', createPaymentIntent);
router.get('/status', getPaymentStatus);

export default router;
