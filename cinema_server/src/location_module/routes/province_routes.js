import { Router } from 'express';

import { getProvincesforLocation} from '../controllers/location_controller.js';

const router = Router();

router.get('/', getProvincesforLocation);

export default router;