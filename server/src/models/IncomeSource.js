import mongoose from 'mongoose';
import { INCOME_FREQUENCIES, INCOME_SOURCE_TYPES, MAX_AMOUNT } from '../constants/finance.js';
import { roundMoney } from '../utils/money.js';

/**
 * A source of income (a salary, a freelance client, rent from a flat...).
 * The money actually received is stored as `income` transactions linked by
 * `incomeSourceId`, so balances and analytics read from a single ledger.
 */
const incomeSourceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    type: { type: String, enum: INCOME_SOURCE_TYPES, required: true },
    // Expected amount per occurrence (0 allowed for irregular sources).
    expectedAmount: { type: Number, min: 0, max: MAX_AMOUNT, default: 0, set: roundMoney },
    frequency: { type: String, enum: INCOME_FREQUENCIES, default: 'monthly' },
    nextExpectedDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    notes: { type: String, trim: true, maxlength: 300, default: '' },
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

incomeSourceSchema.index({ userId: 1, isActive: -1, name: 1 });

export const IncomeSource = mongoose.models.IncomeSource ?? mongoose.model('IncomeSource', incomeSourceSchema);
