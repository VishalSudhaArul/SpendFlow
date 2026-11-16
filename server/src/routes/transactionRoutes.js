import { Router } from 'express';
import * as controller from '../controllers/transactionController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import {
  createTransactionSchema,
  exportTransactionsQuery,
  listTransactionsQuery,
  updateTransactionSchema,
} from '../validators/transactionValidators.js';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: listTransactionsQuery }), controller.list);
router.get('/export', validate({ query: exportTransactionsQuery }), controller.exportCsv);
router.post('/', validate({ body: createTransactionSchema }), controller.create);
router.get('/:id', validate({ params: idParams }), controller.getOne);
router.patch('/:id', validate({ params: idParams, body: updateTransactionSchema }), controller.update);
router.delete('/:id', validate({ params: idParams }), controller.remove);

export default router;
