import { Router } from 'express';
import 
{ 
    getSnackList,
    countSnacks,
    getSnackByID,
} from '../controllers/snack_controller.js';

const router = Router();

router.get('/', getSnackList);
router.get('/count', countSnacks);
router.get('/:id', getSnackByID);
//router.post('/', createLocation);
//router.put('/:id', editLocation);
//router.delete('/:id', deleteLocation);

export default router;