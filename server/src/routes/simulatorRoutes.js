import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { simulationSchema } from '../validators/simulatorValidators.js';
import { loadBaseline, runSimulation } from '../services/simulatorService.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();
router.use(requireAuth);

// The typical month the simulator starts from (for the scenario builder UI).
router.get('/baseline', async (req, res) => {
  const { baseline, context } = await loadBaseline(req.userId);
  sendSuccess(res, { ...baseline, startBalance: context.startBalance, budgets: context.budgets, goalsRequiredMonthly: context.goalsRequiredMonthly });
});

// POST because the scenario list is a structured body; nothing is saved.
router.post('/run', validate({ body: simulationSchema }), async (req, res) => {
  sendSuccess(res, await runSimulation(req.userId, req.body));
});

export default router;
