import express from 'express';
import {
  getGoals,
  createGoal,
  contributeToGoal,
  updateGoal,
  deleteGoal,
} from '../controllers/goalController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getGoals)
  .post(createGoal);

router.post('/:id/contribute', contributeToGoal);

router.route('/:id')
  .put(updateGoal)
  .delete(deleteGoal);

export default router;
