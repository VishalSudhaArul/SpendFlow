import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    type: {
      type: String,
      enum: ['expense', 'income'],
      default: 'expense',
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Food',
        'Transport',
        'Shopping',
        'Bills',
        'Rent',
        'Education',
        'Health',
        'Entertainment',
        'Travel',
        'Subscriptions',
        'Personal',
        'Investments',
        'Other',
      ],
      default: 'Other',
      index: true,
    },
    subcategory: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
      index: true,
    },
    merchant: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash', 'Wallet', 'Other'],
      default: 'UPI',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    recurring: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    isAnomaly: {
      type: Boolean,
      default: false,
    },
    anomalyReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for high-speed queries
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });

export default mongoose.model('Transaction', transactionSchema);
