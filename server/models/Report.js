import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
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
    },
    year: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    summaryData: {
      totalIncome: Number,
      totalExpenses: Number,
      netSavings: Number,
      savingsRate: Number,
      healthScore: Number,
      topCategories: [
        {
          category: String,
          amount: Number,
          percentage: Number,
        },
      ],
      largestTransactions: [
        {
          description: String,
          amount: Number,
          category: String,
          date: Date,
        },
      ],
      budgetStatus: [
        {
          category: String,
          limit: Number,
          spent: Number,
          percentage: Number,
        },
      ],
      anomaliesCount: Number,
      subscriptionTotal: Number,
    },
    aiNarrative: {
      type: String,
      default: '',
    },
    recommendations: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ userId: 1, year: 1, month: 1 });

export default mongoose.model('Report', reportSchema);
