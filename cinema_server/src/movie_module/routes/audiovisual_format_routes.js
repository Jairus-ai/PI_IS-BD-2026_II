import { Router } from 'express';
import { getAudiovisualFormatList } from '../controllers/audiovisual_format_controller.js';

const router = Router();

router.get('/', getAudiovisualFormatList);

export default router;