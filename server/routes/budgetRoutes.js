import express from 'express';
import {
  getBudgets,
  setBudget,
  deleteBudget,
  getAIBudgetRecommendation,
} from '../controllers/budgetController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getBudgets)
  .post(setBudget);

router.post('/ai-recommend', getAIBudgetRecommendation);
router.delete('/:id', deleteBudget);

export default router;
