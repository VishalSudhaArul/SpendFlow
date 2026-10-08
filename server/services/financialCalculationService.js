import Transaction from '../models/Transaction.js';
import Income from '../models/Income.js';
import Budget from '../models/Budget.js';
import SavingsGoal from '../models/SavingsGoal.js';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';

export class FinancialCalculationService {
  /**
   * Get start and end of current month
   */
  static getMonthDateRange(year = new Date().getFullYear(), month = new Date().getMonth() + 1) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    return { startDate, endDate };
  }

  /**
   * Calculate total income for a date range
   */
  static async calculateIncome(userId, startDate, endDate) {
    const filter = { userId };
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const result = await Income.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return result.length > 0 ? Math.round(result[0].total * 100) / 100 : 0;
  }

  /**
   * Calculate total expenses for a date range
   */
  static async calculateExpenses(userId, startDate, endDate) {
    const filter = { userId, type: 'expense' };
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const result = await Transaction.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return result.length > 0 ? Math.round(result[0].total * 100) / 100 : 0;
  }

  /**
   * Calculate category totals
   */
  static async calculateCategoryTotals(userId, startDate, endDate) {
    const filter = { userId, type: 'expense' };
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const result = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const totalExpense = result.reduce((sum, item) => sum + item.total, 0);

    return result.map((item) => ({
      category: item._id,
      amount: Math.round(item.total * 100) / 100,
      count: item.count,
      percentage: totalExpense > 0 ? Math.round((item.total / totalExpense) * 1000) / 10 : 0,
    }));
  }

  /**
   * Calculate Budget Usage for a given month/year
   */
  static async calculateBudgetUsage(userId, month = new Date().getMonth() + 1, year = new Date().getFullYear()) {
    const { startDate, endDate } = this.getMonthDateRange(year, month);

    const budgets = await Budget.find({ userId, month, year }).lean();
    const categoryTotals = await this.calculateCategoryTotals(userId, startDate, endDate);

    const categoryMap = {};
    categoryTotals.forEach((cat) => {
      categoryMap[cat.category] = cat.amount;
    });

    const budgetStatus = budgets.map((b) => {
      const spent = categoryMap[b.category] || 0;
      const remaining = Math.max(0, b.limit - spent);
      const percentage = b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0;

      let status = 'Healthy';
      if (percentage >= 100) {
        status = 'Exceeded';
      } else if (percentage >= 90) {
        status = 'Almost Exceeded';
      } else if (percentage >= b.alertThreshold) {
        status = 'Approaching Limit';
      }

      return {
        _id: b._id,
        category: b.category,
        limit: b.limit,
        spent,
        remaining,
        percentage,
        status,
        alertThreshold: b.alertThreshold,
      };
    });

    const totalBudget = budgets.reduce((acc, b) => acc + b.limit, 0);
    const totalSpentInBudget = budgetStatus.reduce((acc, b) => acc + b.spent, 0);
    const overallPercentage = totalBudget > 0 ? Math.round((totalSpentInBudget / totalBudget) * 100) : 0;

    return {
      totalBudget,
      totalSpentInBudget,
      overallPercentage,
      categories: budgetStatus,
    };
  }

  /**
   * Calculate Active Subscriptions load
   */
  static async calculateSubscriptionCost(userId) {
    const subscriptions = await Subscription.find({ userId, status: 'Active' }).lean();

    let monthlyTotal = 0;
    let annualTotal = 0;

    subscriptions.forEach((sub) => {
      if (sub.billingCycle === 'Monthly') {
        monthlyTotal += sub.amount;
        annualTotal += sub.amount * 12;
      } else if (sub.billingCycle === 'Yearly') {
        monthlyTotal += sub.amount / 12;
        annualTotal += sub.amount;
      } else if (sub.billingCycle === 'Quarterly') {
        monthlyTotal += (sub.amount * 4) / 12;
        annualTotal += sub.amount * 4;
      } else if (sub.billingCycle === 'Weekly') {
        monthlyTotal += sub.amount * 4.33;
        annualTotal += sub.amount * 52;
      }
    });

    return {
      count: subscriptions.length,
      monthlyTotal: Math.round(monthlyTotal * 100) / 100,
      annualTotal: Math.round(annualTotal * 100) / 100,
      subscriptions,
    };
  }

  /**
   * Deterministic Safe to Spend Today
   * Formula:
   * (Current Month Income - Spent So Far - Upcoming Bills - Monthly Savings Target - Reserve Buffer) / Days Remaining
   */
  static async calculateSafeToSpend(userId) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const { startDate, endDate } = this.getMonthDateRange(currentYear, currentMonth);

    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const currentDay = now.getDate();
    const daysRemaining = Math.max(1, daysInMonth - currentDay + 1);

    const user = await User.findById(userId).lean();
    let monthlyIncome = await this.calculateIncome(userId, startDate, endDate);
    if (monthlyIncome === 0 && user?.monthlyIncome) {
      monthlyIncome = user.monthlyIncome;
    }

    const spentThisMonth = await this.calculateExpenses(userId, startDate, endDate);

    // Upcoming subscriptions / bills due for the rest of the month
    const upcomingSubs = await Subscription.find({
      userId,
      status: 'Active',
      nextBillingDate: { $gte: now, $lte: endDate },
    }).lean();

    const upcomingBillsAmount = upcomingSubs.reduce((acc, sub) => acc + sub.amount, 0);

    // Savings commitments from active goals
    const activeGoals = await SavingsGoal.find({ userId, isCompleted: false }).lean();
    let monthlySavingsCommitment = 0;
    activeGoals.forEach((goal) => {
      const monthsLeft = Math.max(1, Math.ceil((new Date(goal.targetDate) - now) / (1000 * 60 * 60 * 24 * 30)));
      const requiredMonthly = Math.max(0, (goal.targetAmount - goal.currentAmount) / monthsLeft);
      monthlySavingsCommitment += requiredMonthly;
    });

    // 10% safety reserve
    const minimumReserve = Math.round(monthlyIncome * 0.1);

    const availableDiscretionary = Math.max(
      0,
      monthlyIncome - spentThisMonth - upcomingBillsAmount - monthlySavingsCommitment - minimumReserve
    );

    const safeToSpendDaily = Math.round((availableDiscretionary / daysRemaining) * 100) / 100;

    return {
      safeToSpendDaily,
      availableDiscretionary: Math.round(availableDiscretionary * 100) / 100,
      monthlyIncome,
      spentThisMonth,
      upcomingBillsAmount,
      monthlySavingsCommitment: Math.round(monthlySavingsCommitment * 100) / 100,
      minimumReserve,
      daysRemaining,
      explanation: `Based on your estimated income of ${user?.currency || '₹'}${monthlyIncome.toLocaleString()}, remaining days (${daysRemaining}), upcoming bills (${user?.currency || '₹'}${upcomingBillsAmount.toLocaleString()}), and savings commitments, approximately ${user?.currency || '₹'}${safeToSpendDaily.toLocaleString()}/day is available for discretionary spending.`,
    };
  }

  /**
   * Deterministic 0-100 Financial Health Score
   * Factor Breakdown:
   * 1. Savings Rate (30 pts)
   * 2. Budget Adherence (25 pts)
   * 3. Spending Consistency / Burn Rate (15 pts)
   * 4. Subscription Burden (15 pts)
   * 5. Goal Progress Momentum (15 pts)
   */
  static async calculateFinancialHealthScore(userId) {
    const now = new Date();
    const { startDate, endDate } = this.getMonthDateRange(now.getFullYear(), now.getMonth() + 1);

    const user = await User.findById(userId).lean();
    let income = await this.calculateIncome(userId, startDate, endDate);
    if (income === 0 && user?.monthlyIncome) {
      income = user.monthlyIncome;
    }

    const expenses = await this.calculateExpenses(userId, startDate, endDate);
    const netSavings = Math.max(0, income - expenses);

    // 1. Savings Rate (30 points)
    // Target: 20%+ savings rate gets full 30 pts
    const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;
    const savingsScore = Math.min(30, Math.round((savingsRate / 20) * 30));

    // 2. Budget Adherence (25 points)
    const budgetData = await this.calculateBudgetUsage(userId, now.getMonth() + 1, now.getFullYear());
    let budgetScore = 20; // default baseline if no budgets set
    if (budgetData.categories.length > 0) {
      const healthyCats = budgetData.categories.filter((c) => c.percentage <= 100).length;
      budgetScore = Math.round((healthyCats / budgetData.categories.length) * 25);
    }

    // 3. Spending Consistency (15 points)
    const daysElapsed = Math.max(1, now.getDate());
    const expectedDailyPace = income > 0 ? income / 30 : 1000;
    const actualDailyPace = expenses / daysElapsed;
    let consistencyScore = 15;
    if (actualDailyPace > expectedDailyPace * 1.5) {
      consistencyScore = 5;
    } else if (actualDailyPace > expectedDailyPace * 1.1) {
      consistencyScore = 10;
    }

    // 4. Subscription Burden (15 points)
    const subData = await this.calculateSubscriptionCost(userId);
    const subPercentage = income > 0 ? (subData.monthlyTotal / income) * 100 : 0;
    let subScore = 15;
    if (subPercentage > 20) {
      subScore = 5;
    } else if (subPercentage > 10) {
      subScore = 10;
    }

    // 5. Goal Progress (15 points)
    const goals = await SavingsGoal.find({ userId }).lean();
    let goalScore = 10;
    if (goals.length > 0) {
      const avgProgress = goals.reduce((acc, g) => acc + (g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0), 0) / goals.length;
      goalScore = Math.min(15, Math.round((avgProgress / 100) * 15) + 5);
    }

    const totalScore = Math.min(100, Math.max(0, savingsScore + budgetScore + consistencyScore + subScore + goalScore));

    let grade = 'Excellent';
    let summary = 'Your finances are exceptionally healthy with disciplined savings and well-controlled budgets.';
    if (totalScore < 50) {
      grade = 'Needs Attention';
      summary = 'High spending velocity and limited savings rate indicate a need to optimize discretionary expenses.';
    } else if (totalScore < 75) {
      grade = 'Fair';
      summary = 'Solid baseline, but budgeting adherence or subscription load has room for improvement.';
    } else if (totalScore < 88) {
      grade = 'Good';
      summary = 'Great financial momentum. Maintaining this savings pace will help reach your long-term goals ahead of schedule.';
    }

    return {
      score: totalScore,
      grade,
      summary,
      breakdown: {
        savingsRate: { score: savingsScore, max: 30, value: `${Math.round(savingsRate)}%` },
        budgetAdherence: { score: budgetScore, max: 25, value: `${budgetData.categories.length > 0 ? `${Math.round((budgetScore / 25) * 100)}%` : 'No limits set'}` },
        spendingConsistency: { score: consistencyScore, max: 15, value: actualDailyPace <= expectedDailyPace ? 'Stable' : 'Elevated' },
        subscriptionBurden: { score: subScore, max: 15, value: `${Math.round(subPercentage)}% of income` },
        goalMomentum: { score: goalScore, max: 15, value: `${goals.length} active goals` },
      },
    };
  }
}

export default FinancialCalculationService;
