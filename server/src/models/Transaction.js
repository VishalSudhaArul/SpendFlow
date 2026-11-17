import mongoose from 'mongoose';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  MAX_AMOUNT,
  PAYMENT_METHODS,
  TRANSACTION_TYPES,
} from '../constants/finance.js';
import { roundMoney } from '../utils/money.js';

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Amount must be greater than zero'],
      max: MAX_AMOUNT,
      set: roundMoney,
    },
    category: {
      type: String,
      required: true,
      validate: {
        validator(value) {
          const allowed = this.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
          return allowed.includes(value);
        },
        message: (props) => `"${props.value}" is not a valid category for this transaction type`,
      },
    },
    description: { type: String, required: true, trim: true, maxlength: 120 },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'UPI' },
    // Calendar day stored as midnight UTC (see utils/dates.js).
    date: { type: Date, required: true },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    incomeSourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'IncomeSource', default: null },
    // Where the record came from — manual entry, the AI parser (after user confirmation), or a recurring source.
    origin: { type: String, enum: ['manual', 'ai', 'income_source', 'bill', 'seed'], default: 'manual' },
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

// Every list query is scoped by userId and sorted by date.
transactionSchema.index({ userId: 1, date: -1, _id: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1, date: -1 });
transactionSchema.index({ userId: 1, incomeSourceId: 1, date: -1 });

export const Transaction = mongoose.models.Transaction ?? mongoose.model('Transaction', transactionSchema);
