import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES, MAX_AMOUNT, PAYMENT_METHODS } from '../constants/finance.js';
import { roundMoney } from '../utils/money.js';

/**
 * One payable occurrence: generated from a Subscription, or a one-off bill
 * (e.g. annual car insurance). Paying it records an expense transaction.
 */
const billSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    amount: { type: Number, required: true, min: 1, max: MAX_AMOUNT, set: roundMoney },
    estimated: { type: Boolean, default: false },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'UPI' },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['upcoming', 'paid', 'skipped'], default: 'upcoming' },
    paidAt: { type: Date, default: null },
    paidAmount: { type: Number, default: null },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
    reminderDaysBefore: { type: Number, min: 0, max: 14, default: 3 },
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

billSchema.index({ userId: 1, status: 1, dueDate: 1 });
billSchema.index({ userId: 1, subscriptionId: 1, dueDate: -1 });
// A subscription has at most one bill per due date (makes generation idempotent).
billSchema.index(
  { subscriptionId: 1, dueDate: 1 },
  { unique: true, partialFilterExpression: { subscriptionId: { $type: 'objectId' } } },
);

export const Bill = mongoose.models.Bill ?? mongoose.model('Bill', billSchema);
