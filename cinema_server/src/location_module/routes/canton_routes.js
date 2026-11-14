import { Router } from 'express';

import { getCantonsforLocation} from '../controllers/location_controller.js';

const router = Router();

router.get('/', getCantonsforLocation);

export default router;