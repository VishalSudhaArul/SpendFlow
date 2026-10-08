import mongoose from 'mongoose';

const savingsGoalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    goalName: {
      type: String,
      required: [true, 'Goal name is required'],
      trim: true,
      maxlength: 100,
    },
    category: {
      type: String,
      enum: ['Laptop', 'Phone', 'Travel', 'Emergency Fund', 'Education', 'Vehicle', 'Home', 'General Savings', 'Custom'],
      default: 'General Savings',
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [1, 'Target amount must be at least 1'],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    targetDate: {
      type: Date,
      required: [true, 'Target date is required'],
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    history: [
      {
        amount: Number,
        date: { type: Date, default: Date.now },
        note: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

savingsGoalSchema.index({ userId: 1, isCompleted: 1 });

export default mongoose.model('SavingsGoal', savingsGoalSchema);
