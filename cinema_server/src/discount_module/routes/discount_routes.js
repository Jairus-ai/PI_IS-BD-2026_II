import { Router } from 'express';
import { 
    getDiscountList,
    getDiscountByID,
    getDiscountProducts,
    addDiscount
 } from '../controllers/discount_controller.js';

const router = Router();

router.get('/', getDiscountList);
router.get('/DP/:type', getDiscountProducts);
router.get('/:id', getDiscountByID);
router.post('/:type', addDiscount);

export default router;