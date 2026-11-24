import { Router } from 'express';
import {
  createPaymentIntent,
  getPaymentReservation,
  getPaymentStatus
} from '../controllers/payment_controller.js';
import {
  ROLES,
  requireSession
} from '../../session/session.js';
import { validateBody } from '../../middleware/validate.js';
import { paymentBodySchema } from '../schemas/paymentSchema.js';

const PAYMENT_BODY_ERROR_MESSAGE = 'Los datos del pago no son válidos.';

const router = Router();

router.use(requireSession([ROLES.CLIENT]));
router.get('/reservation', getPaymentReservation);
router.post('/intent', validateBody(paymentBodySchema, PAYMENT_BODY_ERROR_MESSAGE), createPaymentIntent);
router.get('/status', getPaymentStatus);

export default router;
