import Transaction from '../models/Transaction.js';
import Income from '../models/Income.js';
import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import SavingsGoal from '../models/SavingsGoal.js';
import FinancialCalculationService from '../services/financialCalculationService.js';
import ForecastService from '../services/forecastService.js';
import AnomalyDetectionService from '../services/anomalyDetectionService.js';

// @desc    Complete Dashboard Snapshot
// @route   GET /api/analytics/dashboard-summary
export const getDashboardSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).lean();
    const now = new Date();
    const { startDate, endDate } = FinancialCalculationService.getMonthDateRange();

    let totalIncome = await FinancialCalculationService.calculateIncome(userId, startDate, endDate);
    if (totalIncome === 0 && user?.monthlyIncome) {
      totalIncome = user.monthlyIncome;
    }

    const totalExpenses = await FinancialCalculationService.calculateExpenses(userId, startDate, endDate);
    const netSavings = Math.max(0, totalIncome - totalExpenses);
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
    const currentBalance = totalIncome - totalExpenses;

    const [healthScore, safeToSpend, budgetUsage, topCategories, upcomingBills, recentTransactions, activeGoals, forecast] =
      await Promise.all([
        FinancialCalculationService.calculateFinancialHealthScore(userId),
        FinancialCalculationService.calculateSafeToSpend(userId),
        FinancialCalculationService.calculateBudgetUsage(userId),
        FinancialCalculationService.calculateCategoryTotals(userId, startDate, endDate),
        Subscription.find({
          userId,
          status: 'Active',
          nextBillingDate: { $gte: now, $lte: new Date(now.getFullYear(), now.getMonth() + 1, 15) },
        })
          .sort({ nextBillingDate: 1 })
          .limit(4)
          .lean(),
        Transaction.find({ userId }).sort({ date: -1 }).limit(6).lean(),
        SavingsGoal.find({ userId, isCompleted: false }).limit(3).lean(),
        ForecastService.calculateSpendingForecast(userId),
      ]);

    res.json({
      success: true,
      data: {
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate,
        currentBalance,
        healthScore,
        safeToSpend,
        budgetUsage,
        topCategories,
        upcomingBills,
        recentTransactions,
        activeGoals,
        forecast,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Financial Health Score details
// @route   GET /api/analytics/health-score
export const getHealthScore = async (req, res, next) => {
  try {
    const result = await FinancialCalculationService.calculateFinancialHealthScore(req.user._id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Safe-to-Spend Breakdown
// @route   GET /api/analytics/safe-to-spend
export const getSafeToSpend = async (req, res, next) => {
  try {
    const result = await FinancialCalculationService.calculateSafeToSpend(req.user._id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Income vs Expenses Cash Flow Trends
// @route   GET /api/analytics/trends
export const getTrends = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { timeframe = '30d' } = req.query;

    const now = new Date();
    let startDate = new Date();

    if (timeframe === '7d') startDate.setDate(now.getDate() - 7);
    else if (timeframe === '30d') startDate.setDate(now.getDate() - 30);
    else if (timeframe === '3m') startDate.setMonth(now.getMonth() - 3);
    else if (timeframe === '6m') startDate.setMonth(now.getMonth() - 6);
    else if (timeframe === '1y') startDate.setFullYear(now.getFullYear() - 1);
    else startDate.setDate(now.getDate() - 30);

    // Aggregate daily expenses
    const dailyExpenses = await Transaction.aggregate([
      { $match: { userId, type: 'expense', date: { $gte: startDate, $lte: now } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          expense: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Aggregate daily income
    const dailyIncomes = await Income.aggregate([
      { $match: { userId, date: { $gte: startDate, $lte: now } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          income: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Merge by date
    const dateMap = {};
    dailyExpenses.forEach((d) => {
      dateMap[d._id] = { date: d._id, expense: d.expense, income: 0 };
    });
    dailyIncomes.forEach((d) => {
      if (!dateMap[d._id]) dateMap[d._id] = { date: d._id, expense: 0, income: 0 };
      dateMap[d._id].income = d.income;
    });

    const trendData = Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ success: true, timeframe, data: trendData });
  } catch (error) {
    next(error);
  }
};

// @desc    Spending Calendar Heatmap (Last 90 days)
// @route   GET /api/analytics/heatmap
export const getHeatmap = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const data = await Transaction.aggregate([
      { $match: { userId, type: 'expense', date: { $gte: ninetyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ success: true, data: data.map((d) => ({ date: d._id, amount: d.amount, count: d.count })) });
  } catch (error) {
    next(error);
  }
};

// @desc    Merchant Analytics
// @route   GET /api/analytics/merchants
export const getMerchantStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const merchants = await Transaction.aggregate([
      { $match: { userId, type: 'expense', merchant: { $ne: '' } } },
      {
        $group: {
          _id: '$merchant',
          totalSpent: { $sum: '$amount' },
          count: { $sum: 1 },
          lastVisited: { $max: '$date' },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
    ]);

    const formatted = merchants.map((m) => ({
      merchant: m._id,
      totalSpent: Math.round(m.totalSpent * 100) / 100,
      count: m.count,
      average: Math.round((m.totalSpent / m.count) * 100) / 100,
      lastVisited: m.lastVisited,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

// @desc    Category In-Depth Drilldown
// @route   GET /api/analytics/category/:category
export const getCategoryDrilldown = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { category } = req.params;

    const now = new Date();
    const { startDate, endDate } = FinancialCalculationService.getMonthDateRange();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [currentMonthSpend, lastMonthSpend, largestTxns, subcategories] = await Promise.all([
      Transaction.aggregate([
        { $match: { userId, category, type: 'expense', date: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        { $match: { userId, category, type: 'expense', date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.find({ userId, category, type: 'expense' }).sort({ amount: -1 }).limit(5).lean(),
      Transaction.aggregate([
        { $match: { userId, category, type: 'expense', date: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$subcategory', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
      ]),
    ]);

    const currentTotal = currentMonthSpend[0]?.total || 0;
    const lastTotal = lastMonthSpend[0]?.total || 0;
    const changePercentage = lastTotal > 0 ? Math.round(((currentTotal - lastTotal) / lastTotal) * 100) : 0;

    res.json({
      success: true,
      category,
      currentMonthTotal: currentTotal,
      currentMonthCount: currentMonthSpend[0]?.count || 0,
      lastMonthTotal: lastTotal,
      changePercentage,
      largestTransactions: largestTxns,
      subcategories: subcategories.map((s) => ({ subcategory: s._id || 'General', total: s.total })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Spending Forecast
// @route   GET /api/analytics/forecast
export const getSpendingForecast = async (req, res, next) => {
  try {
    const forecast = await ForecastService.calculateSpendingForecast(req.user._id);
    res.json({ success: true, data: forecast });
  } catch (error) {
    next(error);
  }
};

// @desc    Detected Outliers & Anomalies
// @route   GET /api/analytics/anomalies
export const getAnomalies = async (req, res, next) => {
  try {
    const anomalies = await AnomalyDetectionService.getAnomalies(req.user._id);
    res.json({ success: true, data: anomalies });
  } catch (error) {
    next(error);
  }
};
