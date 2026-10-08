import express from 'express';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  extractExpenseNL,
  importCSV,
} from '../controllers/transactionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getTransactions)
  .post(createTransaction);

router.post('/quick-nl-extract', extractExpenseNL);
router.post('/csv-import', importCSV);

router.route('/:id')
  .put(updateTransaction)
  .delete(deleteTransaction);

export default router;
