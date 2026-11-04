import { Router } from 'express';
import { getBillboardMovies } from '../controllers/billboard_controller.js';

//home page is visible with or without session
const router = Router();

router.get('/movies', getBillboardMovies);

export default router;
