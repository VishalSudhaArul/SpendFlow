import { Router } from 'express';
import * as controller from '../controllers/incomeController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import {
  createIncomeSourceSchema,
  incomeSummaryQuery,
  receiveIncomeSchema,
  updateIncomeSourceSchema,
} from '../validators/incomeValidators.js';

const router = Router();

router.use(requireAuth);

router.get('/summary', validate({ query: incomeSummaryQuery }), controller.summary);
router.get('/sources', controller.list);
router.post('/sources', validate({ body: createIncomeSourceSchema }), controller.create);
router.patch('/sources/:id', validate({ params: idParams, body: updateIncomeSourceSchema }), controller.update);
router.delete('/sources/:id', validate({ params: idParams }), controller.remove);
router.post('/sources/:id/receive', validate({ params: idParams, body: receiveIncomeSchema }), controller.receive);

export default router;
