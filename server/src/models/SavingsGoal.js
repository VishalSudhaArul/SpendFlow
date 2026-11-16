import mongoose from 'mongoose';
import { MAX_AMOUNT } from '../constants/finance.js';
import { roundMoney } from '../utils/money.js';

export const GOAL_ICONS = ['piggy-bank', 'shield', 'plane', 'laptop', 'home', 'car', 'graduation-cap', 'heart', 'gift', 'target'];
export const MAX_CONTRIBUTIONS = 1000;

const contributionSchema = new mongoose.Schema(
  {
    // Positive = money set aside, negative = money taken back out of the goal.
    amount: { type: Number, required: true, set: roundMoney },
    date: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 120, default: '' },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } },
);

/**
 * A savings target. Contributions record money the user has set aside for it.
 * They are tracked separately from transactions: moving money into savings is
 * not spending, so it must not inflate expense totals.
 */
const savingsGoalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    targetAmount: { type: Number, required: true, min: 1, max: MAX_AMOUNT, set: roundMoney },
    savedAmount: { type: Number, default: 0, min: 0, set: roundMoney },
    deadline: { type: Date, default: null },
    icon: { type: String, enum: GOAL_ICONS, default: 'piggy-bank' },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
    completedAt: { type: Date, default: null },
    contributions: {
      type: [contributionSchema],
      default: [],
      validate: [(list) => list.length <= MAX_CONTRIBUTIONS, `A goal can hold at most ${MAX_CONTRIBUTIONS} contributions`],
    },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.userId;
        ret.contributions = (ret.contributions ?? []).map(({ _id, ...c }) => ({ id: _id.toString(), ...c }));
        return ret;
      },
    },
  },
);

savingsGoalSchema.index({ userId: 1, status: 1, deadline: 1 });

export const SavingsGoal = mongoose.models.SavingsGoal ?? mongoose.model('SavingsGoal', savingsGoalSchema);
