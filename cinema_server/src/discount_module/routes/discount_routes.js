import { Router } from 'express';
import { 
    getDiscountList,
    getDiscountByName
 } from '../controllers/discount_controller.js';

const router = Router();

let r = router.get('/', getDiscountList);
router.get('/:name', getDiscountByName);

export default router;