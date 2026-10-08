import express from 'express';
import {
  chatWithCoach,
  getChatHistory,
  clearChatHistory,
  getAIRecommendations,
  getWeeklyRecap,
  generateMonthlyReport,
} from '../controllers/aiController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/chat', chatWithCoach);
router.get('/chat-history', getChatHistory);
router.delete('/chat-history', clearChatHistory);
router.get('/recommendations', getAIRecommendations);
router.get('/weekly-recap', getWeeklyRecap);
router.post('/monthly-report', generateMonthlyReport);

export default router;
