import express from 'express';
import { simulateWhatIf } from '../controllers/whatIfController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/simulate', simulateWhatIf);

export default router;
