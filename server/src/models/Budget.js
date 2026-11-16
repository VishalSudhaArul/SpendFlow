import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES, MAX_AMOUNT } from '../constants/finance.js';
import { roundMoney } from '../utils/money.js';

/**
 * A monthly spending limit. `category: null` is the overall budget for the
 * month; otherwise it limits one expense category.
 */
const budgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    category: {
      type: String,
      default: null,
      validate: {
        validator: (value) => value === null || EXPENSE_CATEGORIES.includes(value),
        message: (props) => `"${props.value}" is not an expense category`,
      },
    },
    limit: { type: Number, required: true, min: 1, max: MAX_AMOUNT, set: roundMoney },
    // Percentage of the limit at which the budget shows a warning.
    alertThreshold: { type: Number, min: 50, max: 100, default: 80 },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.userId;
        return ret;
      },
    },
  },
);

// One budget per category (or one overall budget) per user per month.
budgetSchema.index({ userId: 1, month: 1, category: 1 }, { unique: true });

export const Budget = mongoose.models.Budget ?? mongoose.model('Budget', budgetSchema);
