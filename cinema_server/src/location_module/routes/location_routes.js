import { Router } from 'express';
import { 
    getLocationsList,
    getLocationByID,
    getLocationListForCrud,
    countLocations
 } from '../controllers/location_controller.js';

const router = Router();

router.get('/', getLocationsList);
router.get('/l/', getLocationListForCrud);
router.get('/count', countLocations);
router.get('/:id', getLocationByID);

export default router;