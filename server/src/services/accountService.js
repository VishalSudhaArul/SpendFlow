/**
 * The user's control over their own data: a full export, and permanent
 * deletion of the account and everything linked to it.
 */
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { IncomeSource } from '../models/IncomeSource.js';
import { Budget } from '../models/Budget.js';
import { SavingsGoal } from '../models/SavingsGoal.js';
import { Subscription } from '../models/Subscription.js';
import { Bill } from '../models/Bill.js';
import { Notification } from '../models/Notification.js';
import { AIConversation, AIInsight } from '../models/AIConversation.js';
import { ApiError } from '../utils/ApiError.js';

// Every collection that stores per-user data. A new model must be added here
// (tests check that deletion leaves nothing behind).
export const USER_DATA_MODELS = { Transaction, IncomeSource, Budget, SavingsGoal, Subscription, Bill, Notification, AIConversation, AIInsight };

export async function exportAccount(user) {
  const userId = user._id;
  const [transactions, incomeSources, budgets, savingsGoals, subscriptions, bills, aiConversations] = await Promise.all([
    Transaction.find({ userId }).sort({ date: 1 }),
    IncomeSource.find({ userId }),
    Budget.find({ userId }).sort({ month: 1 }),
    SavingsGoal.find({ userId }),
    Subscription.find({ userId }),
    Bill.find({ userId }).sort({ dueDate: 1 }),
    AIConversation.find({ userId }).sort({ createdAt: 1 }),
  ]);
  return {
    format: 'spendflow-ai-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: user.toJSON(),
    transactions,
    incomeSources,
    budgets,
    savingsGoals,
    subscriptions,
    bills,
    aiConversations,
  };
}

/** Permanently deletes the account after re-checking the password. */
export async function deleteAccount(userId, password) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.unauthorized();
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(400, 'Password is incorrect', {
      details: [{ location: 'body', path: 'password', message: 'Password is incorrect' }],
    });
  }
  const counts = {};
  await Promise.all(
    Object.entries(USER_DATA_MODELS).map(async ([name, Model]) => {
      counts[name] = (await Model.deleteMany({ userId: user._id })).deletedCount;
    }),
  );
  await user.deleteOne();
  return counts;
}
