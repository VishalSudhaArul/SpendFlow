import { SavingsGoal } from '../models/SavingsGoal.js';
import { ApiError } from '../utils/ApiError.js';
import { findOwnedOrThrow } from '../utils/ownership.js';
import { parseDateOnly, todayUtc } from '../utils/dates.js';
import { roundMoney } from '../utils/money.js';
import { goalProjection } from './finance/planning.js';
import { notifyGoalReached } from './notificationService.js';

const STATUS_ORDER = { active: 0, completed: 1, archived: 2 };
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export function withProjection(goal, today = todayUtc()) {
  const json = goal.toJSON();
  json.contributions.sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.createdAt) - new Date(a.createdAt));
  return { ...json, ...goalProjection(goal, today) };
}

export async function listGoals(userId, { status } = {}) {
  const filter = { userId };
  if (status) filter.status = status;
  const goals = await SavingsGoal.find(filter);
  const today = todayUtc();

  const items = goals
    .map((goal) => withProjection(goal, today))
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
        (a.deadline ? new Date(a.deadline) : Infinity) - (b.deadline ? new Date(b.deadline) : Infinity),
    );

  const active = items.filter((g) => g.status === 'active');
  return {
    items,
    summary: {
      activeCount: active.length,
      totalTarget: roundMoney(active.reduce((sum, g) => sum + g.targetAmount, 0)),
      totalSaved: roundMoney(active.reduce((sum, g) => sum + g.saved, 0)),
      // What all active goals with deadlines need per month combined.
      requiredMonthly: roundMoney(active.reduce((sum, g) => sum + (g.requiredMonthly ?? 0), 0)),
      completedCount: items.filter((g) => g.status === 'completed').length,
    },
  };
}

function toDates(data) {
  const result = { ...data };
  if (data.deadline !== undefined) result.deadline = data.deadline ? parseDateOnly(data.deadline) : null;
  return result;
}

export async function createGoal(userId, data) {
  const { initialAmount = 0, ...rest } = data;
  const goal = new SavingsGoal({ ...toDates(rest), userId });
  if (initialAmount > 0) {
    goal.contributions.push({ amount: initialAmount, date: todayUtc(), note: 'Starting balance' });
    goal.savedAmount = initialAmount;
  }
  syncCompletion(goal);
  await goal.save();
  return withProjection(goal);
}

export async function updateGoal(userId, id, changes) {
  const goal = await findOwnedOrThrow(SavingsGoal, id, userId, { label: 'Goal' });
  goal.set(toDates(changes));
  if (changes.status === 'active' || changes.targetAmount !== undefined) syncCompletion(goal);
  await goal.save();
  return withProjection(goal);
}

export async function deleteGoal(userId, id) {
  const goal = await findOwnedOrThrow(SavingsGoal, id, userId, { label: 'Goal' });
  await goal.deleteOne();
}

/** Marks a goal completed when it reaches its target, and re-opens it if it drops below. */
function syncCompletion(goal) {
  if (goal.status === 'archived') return false;
  const reached = goal.savedAmount >= goal.targetAmount;
  if (reached && goal.status !== 'completed') {
    goal.status = 'completed';
    goal.completedAt = new Date();
    return true;
  }
  if (!reached && goal.status === 'completed') {
    goal.status = 'active';
    goal.completedAt = null;
  }
  return false;
}

export async function addContribution(userId, id, { amount, type, date, note }) {
  const goal = await findOwnedOrThrow(SavingsGoal, id, userId, { label: 'Goal' });
  if (goal.status === 'archived') throw ApiError.badRequest('Restore this goal before adding money to it');

  const signed = type === 'withdrawal' ? -amount : amount;
  if (goal.savedAmount + signed < 0) {
    throw new ApiError(422, 'Some fields are invalid', {
      details: [{ location: 'body', path: 'amount', message: `You can withdraw at most ${goal.savedAmount}` }],
    });
  }

  goal.contributions.push({ amount: signed, date: date ? parseDateOnly(date) : todayUtc(), note });
  goal.savedAmount = roundMoney(goal.savedAmount + signed);
  const justCompleted = syncCompletion(goal);
  await goal.save();
  if (justCompleted) await notifyGoalReached(userId, goal);
  return { goal: withProjection(goal), justCompleted };
}

export async function removeContribution(userId, id, contributionId) {
  const goal = await findOwnedOrThrow(SavingsGoal, id, userId, { label: 'Goal' });
  const contribution = goal.contributions.id(contributionId);
  if (!contribution) throw ApiError.notFound('Contribution not found');

  if (goal.savedAmount - contribution.amount < 0) {
    throw ApiError.badRequest('Removing this deposit would make the saved amount negative');
  }
  goal.savedAmount = roundMoney(goal.savedAmount - contribution.amount);
  contribution.deleteOne();
  syncCompletion(goal);
  await goal.save();
  return withProjection(goal);
}
