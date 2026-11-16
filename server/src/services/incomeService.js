import mongoose from 'mongoose';
import { IncomeSource } from '../models/IncomeSource.js';
import { Transaction } from '../models/Transaction.js';
import { FREQUENCY_PER_MONTH, INCOME_TYPE_CATEGORY } from '../constants/finance.js';
import { ApiError } from '../utils/ApiError.js';
import { findOwnedOrThrow } from '../utils/ownership.js';
import {
  addMonthsUtc,
  advanceByFrequency,
  monthKey,
  parseDateOnly,
  startOfMonthUtc,
  toDateOnly,
  todayUtc,
} from '../utils/dates.js';
import { roundMoney } from '../utils/money.js';
import { createTransaction } from './transactionService.js';

/** Expected income per month for a source, normalizing weekly/yearly/etc. */
export function monthlyEquivalent(source) {
  if (!source.isActive) return 0;
  return roundMoney(source.expectedAmount * (FREQUENCY_PER_MONTH[source.frequency] ?? 0));
}

function withDates(data) {
  const result = { ...data };
  if (data.nextExpectedDate !== undefined) {
    result.nextExpectedDate = data.nextExpectedDate ? parseDateOnly(data.nextExpectedDate) : null;
  }
  return result;
}

export async function listIncomeSources(userId) {
  const uid = new mongoose.Types.ObjectId(String(userId));
  const monthStart = startOfMonthUtc(todayUtc());

  const [sources, receivedThisMonth] = await Promise.all([
    IncomeSource.find({ userId: uid }).sort({ isActive: -1, name: 1 }),
    Transaction.aggregate([
      { $match: { userId: uid, type: 'income', incomeSourceId: { $ne: null }, date: { $gte: monthStart } } },
      { $group: { _id: '$incomeSourceId', total: { $sum: '$amount' }, lastDate: { $max: '$date' } } },
    ]),
  ]);

  const receivedById = new Map(receivedThisMonth.map((row) => [row._id.toString(), row]));

  return sources.map((source) => {
    const received = receivedById.get(source._id.toString());
    return {
      ...source.toJSON(),
      monthlyEquivalent: monthlyEquivalent(source),
      receivedThisMonth: roundMoney(received?.total ?? 0),
      lastReceivedDate: received?.lastDate ?? null,
    };
  });
}

export async function createIncomeSource(userId, data) {
  return IncomeSource.create({ ...withDates(data), userId });
}

export async function updateIncomeSource(userId, id, changes) {
  const source = await findOwnedOrThrow(IncomeSource, id, userId, { label: 'Income source' });
  source.set(withDates(changes));
  await source.save();
  return source;
}

/**
 * Deletes a source. Income already received stays in the ledger (history and
 * balances must not change retroactively); it is simply unlinked.
 */
export async function deleteIncomeSource(userId, id) {
  const source = await findOwnedOrThrow(IncomeSource, id, userId, { label: 'Income source' });
  await Transaction.updateMany({ userId, incomeSourceId: source._id }, { $set: { incomeSourceId: null } });
  await source.deleteOne();
}

/** Records a payment received from a source and moves its next expected date forward. */
export async function receiveIncome(userId, id, input) {
  const source = await findOwnedOrThrow(IncomeSource, id, userId, { label: 'Income source' });
  if (!source.isActive) throw ApiError.badRequest('This income source is paused. Resume it first.');

  const amount = input.amount ?? source.expectedAmount;
  if (!amount || amount <= 0) {
    throw new ApiError(422, 'Some fields are invalid', {
      details: [{ location: 'body', path: 'amount', message: 'Enter the amount you received' }],
    });
  }

  const date = input.date ?? toDateOnly(todayUtc());
  const transaction = await createTransaction(
    userId,
    {
      type: 'income',
      amount,
      category: INCOME_TYPE_CATEGORY[source.type],
      description: input.description ?? source.name,
      paymentMethod: input.paymentMethod,
      date,
      notes: input.notes,
      incomeSourceId: source._id.toString(),
    },
    { origin: 'income_source' },
  );

  // Advance the schedule past the received date (handles catching up on missed periods).
  if (source.nextExpectedDate && source.frequency !== 'irregular') {
    const receivedOn = parseDateOnly(date);
    let next = source.nextExpectedDate;
    let guard = 0;
    while (next <= receivedOn && guard < 120) {
      next = advanceByFrequency(next, source.frequency);
      guard += 1;
    }
    source.nextExpectedDate = next;
    await source.save();
  }

  return { transaction, source };
}

/** Month-by-month income received, split by source, plus the expected monthly total. */
export async function incomeSummary(userId, { months }) {
  const uid = new mongoose.Types.ObjectId(String(userId));
  const currentMonth = startOfMonthUtc(todayUtc());
  const firstMonth = addMonthsUtc(currentMonth, -(months - 1));

  const [rows, sources] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId: uid, type: 'income', date: { $gte: firstMonth } } },
      {
        $group: {
          _id: { month: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } }, source: '$incomeSourceId' },
          total: { $sum: '$amount' },
        },
      },
    ]),
    IncomeSource.find({ userId: uid }),
  ]);

  const sourceNames = new Map(sources.map((s) => [s._id.toString(), s.name]));
  const monthList = Array.from({ length: months }, (_, i) => monthKey(addMonthsUtc(firstMonth, i)));
  const byMonth = new Map(monthList.map((key) => [key, { month: key, total: 0, bySource: {} }]));

  for (const row of rows) {
    const bucket = byMonth.get(row._id.month);
    if (!bucket) continue;
    const name = row._id.source ? (sourceNames.get(row._id.source.toString()) ?? 'Removed source') : 'Other income';
    bucket.bySource[name] = roundMoney((bucket.bySource[name] ?? 0) + row.total);
    bucket.total = roundMoney(bucket.total + row.total);
  }

  const monthly = [...byMonth.values()];
  const completedMonths = monthly.slice(0, -1).filter((m) => m.total > 0);
  const averageMonthly = completedMonths.length
    ? roundMoney(completedMonths.reduce((sum, m) => sum + m.total, 0) / completedMonths.length)
    : 0;

  return {
    months: monthly,
    expectedMonthly: roundMoney(sources.reduce((sum, s) => sum + monthlyEquivalent(s), 0)),
    receivedThisMonth: monthly.at(-1)?.total ?? 0,
    averageMonthly,
  };
}
