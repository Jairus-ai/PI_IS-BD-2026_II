import { Router } from 'express';
import { 
    getLocationsList,
    getLocationByID,
    getLocationListForCrud,
    countLocations,
    createLocation,
    getCantonsforLocation
 } from '../controllers/location_controller.js';

const router = Router();

router.get('/', getLocationsList);
router.get('/l/', getLocationListForCrud);
router.get('/c', getCantonsforLocation);
router.get('/count', countLocations);
router.get('/:id', getLocationByID);
router.post('/', createLocation);

export default router;