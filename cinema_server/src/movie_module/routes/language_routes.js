import { Router } from 'express';
import { getLanguageList } from '../controllers/language_controller.js';

const router = Router();

router.get('/', getLanguageList);

export default router;