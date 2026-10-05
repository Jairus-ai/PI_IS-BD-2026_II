import { Router } from 'express';
import { 
    getDiscountList,
    getDiscountByName,
    getDiscountByID
 } from '../controllers/discount_controller.js';

const router = Router();

router.get('/', getDiscountList);
router.get('/:name', getDiscountByName);
router.get('/:id', getDiscountByID);

export default router;