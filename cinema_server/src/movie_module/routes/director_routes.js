import { Router } from 'express';
import { getDirectorList } from '../controllers/director_controller.js';

const router = Router();

router.get('/', getDirectorList);

export default router;
