import { Router } from 'express';
import { 
    getDiscountList,
    getDiscountByID
 } from '../controllers/discount_controller.js';

const router = Router();

router.get('/', getDiscountList);
router.get('/:id', getDiscountByID);

export default router;