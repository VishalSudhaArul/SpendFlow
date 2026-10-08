import mongoose from 'mongoose';

const incomeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Income amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    source: {
      type: String,
      required: [true, 'Source is required'],
      enum: ['Salary', 'Freelance', 'Allowance', 'Scholarship', 'Business', 'Investment', 'Rental', 'Other'],
      default: 'Salary',
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
      index: true,
    },
    recurring: {
      type: Boolean,
      default: false,
    },
    recurrenceInterval: {
      type: String,
      enum: ['monthly', 'weekly', 'biweekly', 'one-time'],
      default: 'monthly',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

incomeSchema.index({ userId: 1, date: -1 });

export default mongoose.model('Income', incomeSchema);
