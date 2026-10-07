import { Router } from 'express';
import { 
    getDiscountList,
    getDiscountByID,
    getDiscountProducts,
    addDiscount
 } from '../controllers/discount_controller.js';

const router = Router();

router.get('/', getDiscountList);
router.get('/DP', getDiscountProducts);
router.get('/:id', getDiscountByID);
router.post('/', addDiscount);

export default router;