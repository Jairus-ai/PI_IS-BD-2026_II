import { Router } from 'express';
import { 
    getDiscountList,
    getDiscountByID,
    getDiscountProducts,
    addDiscount,
    deleteDiscount,
    modifyDiscount
 } from '../controllers/discount_controller.js';

const router = Router();

router.get('/', getDiscountList);
router.get('/DP/:type', getDiscountProducts);
router.get('/:id', getDiscountByID);
router.post('/:type', addDiscount);
router.put('/DD/:id/:type', modifyDiscount)
router.put('/:id', deleteDiscount)

export default router;