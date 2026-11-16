import * as transactions from '../services/transactionService.js';
import { paginationMeta, sendCreated, sendSuccess } from '../utils/response.js';
import { toCsv } from '../utils/csv.js';
import { toDateOnly, todayUtc } from '../utils/dates.js';

export async function list(req, res) {
  const { items, totals, total, page, limit } = await transactions.listTransactions(req.userId, req.validatedQuery);
  sendSuccess(res, { items, totals }, { meta: paginationMeta({ page, limit, total }) });
}

export async function create(req, res) {
  const { origin, ...data } = req.body;
  const transaction = await transactions.createTransaction(req.userId, data, { origin });
  sendCreated(res, { transaction });
}

export async function getOne(req, res) {
  const transaction = await transactions.getTransaction(req.userId, req.params.id);
  sendSuccess(res, { transaction });
}

export async function update(req, res) {
  const transaction = await transactions.updateTransaction(req.userId, req.params.id, req.body);
  sendSuccess(res, { transaction });
}

export async function remove(req, res) {
  await transactions.deleteTransaction(req.userId, req.params.id);
  sendSuccess(res, { deleted: true });
}

const CSV_COLUMNS = [
  { header: 'Date', value: (t) => toDateOnly(t.date) },
  { header: 'Type', value: (t) => t.type },
  { header: 'Description', value: (t) => t.description },
  { header: 'Category', value: (t) => t.category },
  { header: 'Payment method', value: (t) => t.paymentMethod },
  { header: 'Amount', value: (t) => t.amount },
  { header: 'Signed amount', value: (t) => (t.type === 'expense' ? -t.amount : t.amount) },
  { header: 'Income source', value: (t) => t.incomeSourceId?.name ?? '' },
  { header: 'Notes', value: (t) => t.notes },
];

export async function exportCsv(req, res) {
  const rows = await transactions.exportTransactions(req.userId, req.validatedQuery);
  const filename = `spendflow-transactions-${toDateOnly(todayUtc())}.csv`;

  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
  });
  res.send(toCsv(CSV_COLUMNS, rows));
}
