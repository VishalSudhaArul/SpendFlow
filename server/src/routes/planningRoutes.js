import { Router } from 'express';
import * as budgetController from '../controllers/budgetController.js';
import * as goalController from '../controllers/goalController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import {
  bulkBudgetsSchema,
  contributionParams,
  contributionSchema,
  copyBudgetsSchema,
  createBudgetSchema,
  createGoalSchema,
  fiftyThirtyTwentyQuery,
  goalListQuery,
  monthQuery,
  updateBudgetSchema,
  updateGoalSchema,
} from '../validators/planningValidators.js';

export const budgetRoutes = Router();
budgetRoutes.use(requireAuth);
budgetRoutes.get('/', validate({ query: monthQuery }), budgetController.overview);
budgetRoutes.get('/recommendations', validate({ query: monthQuery }), budgetController.recommendations);
budgetRoutes.get('/fifty-thirty-twenty', validate({ query: fiftyThirtyTwentyQuery }), budgetController.fiftyThirtyTwenty);
budgetRoutes.post('/', validate({ body: createBudgetSchema }), budgetController.create);
budgetRoutes.post('/bulk', validate({ body: bulkBudgetsSchema }), budgetController.bulk);
budgetRoutes.post('/copy', validate({ body: copyBudgetsSchema }), budgetController.copy);
budgetRoutes.patch('/:id', validate({ params: idParams, body: updateBudgetSchema }), budgetController.update);
budgetRoutes.delete('/:id', validate({ params: idParams }), budgetController.remove);

export const goalRoutes = Router();
goalRoutes.use(requireAuth);
goalRoutes.get('/', validate({ query: goalListQuery }), goalController.list);
goalRoutes.post('/', validate({ body: createGoalSchema }), goalController.create);
goalRoutes.patch('/:id', validate({ params: idParams, body: updateGoalSchema }), goalController.update);
goalRoutes.delete('/:id', validate({ params: idParams }), goalController.remove);
goalRoutes.post('/:id/contributions', validate({ params: idParams, body: contributionSchema }), goalController.contribute);
goalRoutes.delete(
  '/:id/contributions/:contributionId',
  validate({ params: contributionParams }),
  goalController.removeContribution,
);
