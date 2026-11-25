import { Router } from 'express';
import 
{ 
    getSnackList,
    countSnacks,
    getSnackByID,
    createSnack,
    editSnack,
    deleteSnack
} from '../controllers/snack_controller.js';

const router = Router();

router.get('/', getSnackList);
router.get('/count', countSnacks);
router.get('/:id', getSnackByID);
router.post('/', createSnack);
router.put('/:id', editSnack);
router.delete('/:id', deleteSnack);

export default router;