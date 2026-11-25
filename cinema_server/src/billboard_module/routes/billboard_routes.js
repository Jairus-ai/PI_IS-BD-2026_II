import { Router } from 'express';
import { getBillboardMovies, getNowShowingMovies } from '../controllers/billboard_controller.js';

//home page is visible with or without session
const router = Router();

router.get('/movies', getBillboardMovies);
router.get('/now-showing', getNowShowingMovies);

export default router;
