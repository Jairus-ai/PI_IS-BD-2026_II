import { Router } from 'express';
import { getLocationsList } from '../controllers/location_controller.js';

const router = Router();

router.get('/', getLocationsList);

export default router;