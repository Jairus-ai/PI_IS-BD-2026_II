import { Router } from 'express';
import { getRatingList } from '../controllers/rating_controller.js';

const router = Router();

router.get('/', getRatingList);

export default router;