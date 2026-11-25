import { Router } from 'express';
import { getScreeningsByMovie } from '../controllers/screening_controller.js';

const router = Router();

router.get('/movie/:idMovie', getScreeningsByMovie);

export default router;