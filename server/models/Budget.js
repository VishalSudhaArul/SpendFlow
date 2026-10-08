import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
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
    },
    limit: {
      type: Number,
      required: [true, 'Budget limit amount is required'],
      min: [1, 'Budget limit must be greater than 0'],
    },
    alertThreshold: {
      type: Number,
      default: 80, // trigger warning at 80%
      min: 10,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness per user per category per month
budgetSchema.index({ userId: 1, month: 1, year: 1, category: 1 }, { unique: true });

export default mongoose.model('Budget', budgetSchema);
