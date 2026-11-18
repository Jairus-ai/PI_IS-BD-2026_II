import { Router } from 'express';
import { 
    getDiscountList,
    getDiscountByID,
    getDiscountProducts,
    addDiscount,
    deleteDiscount,
    modifyDiscount,
    countDiscounts
 } from '../controllers/discount_controller.js';

const router = Router();

router.get('/', getDiscountList);
router.get('/DP/:type', getDiscountProducts);
router.get('/count', countDiscounts)
router.get('/:id', getDiscountByID);
router.post('/:type', addDiscount);
router.put('/EDIT/:id/:type', modifyDiscount)
router.put('/:id', deleteDiscount)

export default router;