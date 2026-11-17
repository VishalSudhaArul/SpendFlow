import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES, MAX_AMOUNT, PAYMENT_METHODS } from '../constants/finance.js';
import { roundMoney } from '../utils/money.js';

export const BILLING_CYCLES = ['weekly', 'monthly', 'quarterly', 'yearly'];
export const CYCLES_PER_MONTH = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };

/**
 * A recurring payment: a subscription (Netflix, gym) or a recurring bill (rent,
 * electricity, EMI). Each due occurrence is a `Bill` document, so history,
 * payments and the calendar all come from one place.
 */
const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    kind: { type: String, enum: ['subscription', 'bill'], default: 'subscription' },
    amount: { type: Number, required: true, min: 1, max: MAX_AMOUNT, set: roundMoney },
    // Variable bills (electricity) show the amount as an estimate until paid.
    variableAmount: { type: Boolean, default: false },
    category: { type: String, enum: EXPENSE_CATEGORIES, default: 'Subscriptions' },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'UPI' },
    billingCycle: { type: String, enum: BILLING_CYCLES, default: 'monthly' },
    nextDueDate: { type: Date, required: true },
    reminderDaysBefore: { type: Number, min: 0, max: 14, default: 3 },
    autoPay: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'paused', 'cancelled'], default: 'active' },
    cancelledAt: { type: Date, default: null },
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

subscriptionSchema.index({ userId: 1, status: 1, nextDueDate: 1 });

export const Subscription = mongoose.models.Subscription ?? mongoose.model('Subscription', subscriptionSchema);
