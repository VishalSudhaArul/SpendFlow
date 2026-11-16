import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import { IncomeSource } from '../models/IncomeSource.js';
import { categoriesFor } from '../constants/finance.js';
import { ApiError } from '../utils/ApiError.js';
import { findOwnedOrThrow } from '../utils/ownership.js';
import { endOfDayUtc, parseDateOnly } from '../utils/dates.js';
import { roundMoney } from '../utils/money.js';
import { SORTS } from '../validators/transactionValidators.js';

export const EXPORT_ROW_LIMIT = 10_000;

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Turns validated query filters into a MongoDB filter that is always scoped to the user. */
export function buildTransactionFilter(userId, filters = {}) {
  const filter = { userId: new mongoose.Types.ObjectId(String(userId)) };

  if (filters.type) filter.type = filters.type;
  if (filters.category?.length) filter.category = { $in: filters.category };
  if (filters.paymentMethod?.length) filter.paymentMethod = { $in: filters.paymentMethod };
  if (filters.incomeSourceId) filter.incomeSourceId = new mongoose.Types.ObjectId(filters.incomeSourceId);

  if (filters.from || filters.to) {
    filter.date = {};
    if (filters.from) filter.date.$gte = parseDateOnly(filters.from);
    if (filters.to) filter.date.$lte = endOfDayUtc(parseDateOnly(filters.to));
  }

  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    filter.amount = {};
    if (filters.minAmount !== undefined) filter.amount.$gte = filters.minAmount;
    if (filters.maxAmount !== undefined) filter.amount.$lte = filters.maxAmount;
  }

  if (filters.search) {
    // User text is escaped before building the regex, so it cannot inject regex syntax.
    const pattern = new RegExp(escapeRegex(filters.search), 'i');
    filter.$or = [{ description: pattern }, { notes: pattern }, { category: pattern }];
  }

  return filter;
}

/** Income/expense totals for whatever filter is active (shown above the list). */
async function totalsFor(filter) {
  const rows = await Transaction.aggregate([
    { $match: filter },
    { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const byType = Object.fromEntries(rows.map((row) => [row._id, row]));
  const income = roundMoney(byType.income?.total ?? 0);
  const expense = roundMoney(byType.expense?.total ?? 0);
  return {
    income,
    expense,
    net: roundMoney(income - expense),
    count: (byType.income?.count ?? 0) + (byType.expense?.count ?? 0),
  };
}

export async function listTransactions(userId, query) {
  const { page, limit, sort, ...filters } = query;
  const filter = buildTransactionFilter(userId, filters);

  const [items, totals] = await Promise.all([
    Transaction.find(filter)
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit),
    totalsFor(filter),
  ]);

  return { items, totals, total: totals.count, page, limit };
}

export async function exportTransactions(userId, query) {
  const { sort, ...filters } = query;
  const filter = buildTransactionFilter(userId, filters);
  const count = await Transaction.countDocuments(filter);
  if (count > EXPORT_ROW_LIMIT) {
    throw ApiError.badRequest(
      `This export has ${count} rows. Narrow the filters to ${EXPORT_ROW_LIMIT.toLocaleString('en-IN')} rows or fewer.`,
    );
  }
  return Transaction.find(filter).sort(SORTS[sort]).populate('incomeSourceId', 'name').lean();
}

async function assertIncomeSourceOwned(userId, incomeSourceId) {
  if (!incomeSourceId) return;
  const exists = await IncomeSource.exists({ _id: incomeSourceId, userId });
  if (!exists) {
    throw new ApiError(422, 'Some fields are invalid', {
      details: [{ location: 'body', path: 'incomeSourceId', message: 'Income source not found' }],
    });
  }
}

export async function createTransaction(userId, data, { origin = 'manual' } = {}) {
  if (data.type === 'expense') data.incomeSourceId = null;
  await assertIncomeSourceOwned(userId, data.incomeSourceId);

  return Transaction.create({
    ...data,
    userId,
    date: parseDateOnly(data.date),
    origin,
  });
}

export async function getTransaction(userId, id) {
  return findOwnedOrThrow(Transaction, id, userId, { label: 'Transaction' });
}

export async function updateTransaction(userId, id, changes) {
  const transaction = await getTransaction(userId, id);

  const nextType = changes.type ?? transaction.type;
  const nextCategory = changes.category ?? transaction.category;
  if (!categoriesFor(nextType).includes(nextCategory)) {
    throw new ApiError(422, 'Some fields are invalid', {
      details: [{ location: 'body', path: 'category', message: `Choose a valid ${nextType} category` }],
    });
  }

  if (changes.incomeSourceId !== undefined) await assertIncomeSourceOwned(userId, changes.incomeSourceId);

  const { date, ...rest } = changes;
  transaction.set(rest);
  if (date) transaction.date = parseDateOnly(date);
  if (nextType === 'expense') transaction.incomeSourceId = null;

  await transaction.save();
  return transaction;
}

export async function deleteTransaction(userId, id) {
  const transaction = await getTransaction(userId, id);
  await transaction.deleteOne();
}
