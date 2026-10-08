import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Subscription name is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Subscription amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    billingCycle: {
      type: String,
      enum: ['Monthly', 'Quarterly', 'Yearly', 'Weekly'],
      default: 'Monthly',
    },
    nextBillingDate: {
      type: Date,
      required: [true, 'Next billing date is required'],
      index: true,
    },
    category: {
      type: String,
      default: 'Subscriptions',
    },
    status: {
      type: String,
      enum: ['Active', 'Paused', 'Cancelled'],
      default: 'Active',
      index: true,
    },
    remindDaysBefore: {
      type: Number,
      default: 3,
      min: 0,
      max: 30,
    },
    paymentMethod: {
      type: String,
      default: 'Credit Card',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.index({ userId: 1, nextBillingDate: 1 });

export default mongoose.model('Subscription', subscriptionSchema);
