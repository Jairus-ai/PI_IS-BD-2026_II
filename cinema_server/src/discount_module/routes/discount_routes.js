import { Router } from 'express';
import { getDiscountList } from '../controllers/discount_controller.js';

const router = Router();

router.get('/', getDiscountList);

export default router;