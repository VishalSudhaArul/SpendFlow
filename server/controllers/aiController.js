import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import ChatHistory from '../models/ChatHistory.js';
import Report from '../models/Report.js';
import FinancialCalculationService from '../services/financialCalculationService.js';
import ForecastService from '../services/forecastService.js';
import AIService from '../services/aiService.js';

// @desc    AI Chatbot with strict ground truth financial context
// @route   POST /api/ai/chat
export const chatWithCoach = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const user = await User.findById(userId).lean();
    const now = new Date();
    const { startDate, endDate } = FinancialCalculationService.getMonthDateRange();

    // 1. Compute ground truth financial state
    let monthlyIncome = await FinancialCalculationService.calculateIncome(userId, startDate, endDate);
    if (monthlyIncome === 0 && user?.monthlyIncome) {
      monthlyIncome = user.monthlyIncome;
    }

    const [totalExpenses, healthData, safeToSpendData, budgetData, categoryData, subData, forecastData, recentChats] =
      await Promise.all([
        FinancialCalculationService.calculateExpenses(userId, startDate, endDate),
        FinancialCalculationService.calculateFinancialHealthScore(userId),
        FinancialCalculationService.calculateSafeToSpend(userId),
        FinancialCalculationService.calculateBudgetUsage(userId),
        FinancialCalculationService.calculateCategoryTotals(userId, startDate, endDate),
        FinancialCalculationService.calculateSubscriptionCost(userId),
        ForecastService.calculateSpendingForecast(userId),
        ChatHistory.find({ userId }).sort({ createdAt: -1 }).limit(6).lean(),
      ]);

    const netSavings = Math.max(0, monthlyIncome - totalExpenses);
    const savingsRate = monthlyIncome > 0 ? Math.round((netSavings / monthlyIncome) * 100) : 0;

    const structuredContext = {
      currency: user?.currency || 'INR',
      monthlyIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      safeToSpendDaily: safeToSpendData.safeToSpendDaily,
      healthScore: healthData.score,
      healthGrade: healthData.grade,
      topCategories: categoryData.slice(0, 5),
      budgets: budgetData.categories.map((b) => ({ category: b.category, spent: b.spent, limit: b.limit, status: b.status })),
      subscriptionMonthly: subData.monthlyTotal,
      forecastMonthEnd: forecastData.projectedMonthEndTotal,
    };

    // 2. Call AI Service with ground truth
    const aiResponse = await AIService.answerFinancialQuestion(message, structuredContext, recentChats);

    // 3. Save to ChatHistory
    await ChatHistory.create({
      userId,
      role: 'user',
      message,
    });

    const assistantEntry = await ChatHistory.create({
      userId,
      role: 'assistant',
      message: aiResponse.answer,
      suggestedActions: aiResponse.suggestedActions || [],
    });

    res.json({
      success: true,
      data: assistantEntry,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get chat history
// @route   GET /api/ai/chat-history
export const getChatHistory = async (req, res, next) => {
  try {
    const history = await ChatHistory.find({ userId: req.user._id }).sort({ createdAt: 1 }).limit(50).lean();
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear chat history
// @route   DELETE /api/ai/chat-history
export const clearChatHistory = async (req, res, next) => {
  try {
    await ChatHistory.deleteMany({ userId: req.user._id });
    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    next(error);
  }
};

// @desc    AI Personal Finance Coaching Top 3 Recommendations
// @route   GET /api/ai/recommendations
export const getAIRecommendations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).lean();
    const { startDate, endDate } = FinancialCalculationService.getMonthDateRange();

    let income = await FinancialCalculationService.calculateIncome(userId, startDate, endDate);
    if (income === 0 && user?.monthlyIncome) income = user.monthlyIncome;

    const [expenses, topCategories, budgetData, subData] = await Promise.all([
      FinancialCalculationService.calculateExpenses(userId, startDate, endDate),
      FinancialCalculationService.calculateCategoryTotals(userId, startDate, endDate),
      FinancialCalculationService.calculateBudgetUsage(userId),
      FinancialCalculationService.calculateSubscriptionCost(userId),
    ]);

    const recommendations = [];

    // 1. Top Category Discretionary Recommendation
    const discretionaryCategories = ['Food', 'Shopping', 'Entertainment', 'Travel'];
    const topDiscretionary = topCategories.find((c) => discretionaryCategories.includes(c.category));
    if (topDiscretionary && topDiscretionary.amount > income * 0.25) {
      recommendations.push({
        id: 'rec-1',
        title: `Optimize ${topDiscretionary.category} Spending`,
        description: `You've spent ₹${topDiscretionary.amount.toLocaleString()} (${topDiscretionary.percentage}% of expenses) on ${topDiscretionary.category}. Setting a weekly budget cap could save you ₹${Math.round(topDiscretionary.amount * 0.2).toLocaleString()}/month.`,
        actionType: 'budget',
        impact: 'High',
      });
    } else {
      recommendations.push({
        id: 'rec-1',
        title: 'Maintain Positive Discretionary Pace',
        description: `Your lifestyle spending is well aligned with your monthly income. Keep up the disciplined spending habits!`,
        actionType: 'lifestyle',
        impact: 'Medium',
      });
    }

    // 2. Subscription Audit
    if (subData.monthlyTotal > 1500) {
      recommendations.push({
        id: 'rec-2',
        title: 'Audit Active Subscriptions',
        description: `You currently pay ₹${subData.monthlyTotal.toLocaleString()}/month across ${subData.count} recurring subscriptions (₹${subData.annualTotal.toLocaleString()}/year). Consider cancelling any rarely used services.`,
        actionType: 'subscription',
        impact: 'Medium',
      });
    } else {
      recommendations.push({
        id: 'rec-2',
        title: 'Subscription Load is Optimized',
        description: `Your recurring subscriptions account for ₹${subData.monthlyTotal.toLocaleString()}/month, representing a healthy fraction of your income.`,
        actionType: 'subscription',
        impact: 'Low',
      });
    }

    // 3. Automated Savings Push
    const netSavings = Math.max(0, income - expenses);
    recommendations.push({
      id: 'rec-3',
      title: 'Automate Emergency Fund Contributions',
      description: `Direct ₹${Math.round(Math.max(1000, netSavings * 0.3)).toLocaleString()} to an automated recurring deposit on salary day to guarantee goal completion.`,
      actionType: 'goals',
      impact: 'High',
    });

    res.json({ success: true, recommendations });
  } catch (error) {
    next(error);
  }
};

// @desc    Weekly Money Recap ("Your Week in Money")
// @route   GET /api/ai/weekly-recap
export const getWeeklyRecap = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).lean();
    const now = new Date();

    const currentWeekStart = new Date();
    currentWeekStart.setDate(now.getDate() - 7);

    const prevWeekStart = new Date();
    prevWeekStart.setDate(now.getDate() - 14);

    const [currentWeekTxns, prevWeekTxns] = await Promise.all([
      Transaction.find({ userId, type: 'expense', date: { $gte: currentWeekStart, $lte: now } }).lean(),
      Transaction.find({ userId, type: 'expense', date: { $gte: prevWeekStart, $lt: currentWeekStart } }).lean(),
    ]);

    const totalSpentThisWeek = currentWeekTxns.reduce((a, b) => a + b.amount, 0);
    const totalSpentLastWeek = prevWeekTxns.reduce((a, b) => a + b.amount, 0);

    const changePercent =
      totalSpentLastWeek > 0 ? Math.round(((totalSpentThisWeek - totalSpentLastWeek) / totalSpentLastWeek) * 100) : 0;

    // Largest transaction this week
    const largestTxn = currentWeekTxns.sort((a, b) => b.amount - a.amount)[0] || null;

    // Top category this week
    const catMap = {};
    currentWeekTxns.forEach((t) => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });
    const topCatEntry = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0] || ['General', 0];

    res.json({
      success: true,
      data: {
        totalSpentThisWeek,
        totalSpentLastWeek,
        changePercent,
        largestTransaction: largestTxn,
        topCategory: { category: topCatEntry[0], amount: topCatEntry[1] },
        recommendation:
          changePercent > 15
            ? `Weekly expenses rose by ${changePercent}%. Pacing weekend outings will help restore your safe daily spend target.`
            : `Great pacing! Your spending this week was well-controlled and disciplined.`,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate / Retrieve Monthly AI Report
// @route   POST /api/ai/monthly-report
export const generateMonthlyReport = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const month = parseInt(req.body.month, 10) || new Date().getMonth() + 1;
    const year = parseInt(req.body.year, 10) || new Date().getFullYear();

    const user = await User.findById(userId).lean();
    const currency = user?.currency || 'INR';
    const { startDate, endDate } = FinancialCalculationService.getMonthDateRange(year, month);

    // Check if report already exists in DB
    let report = await Report.findOne({ userId, month, year });

    let income = await FinancialCalculationService.calculateIncome(userId, startDate, endDate);
    if (income === 0 && user?.monthlyIncome) income = user.monthlyIncome;
    const expenses = await FinancialCalculationService.calculateExpenses(userId, startDate, endDate);
    const netSavings = Math.max(0, income - expenses);
    const savingsRate = income > 0 ? Math.round((netSavings / income) * 100) : 0;

    const [healthData, topCategories, largestTxns, budgetData, anomalies, subData] = await Promise.all([
      FinancialCalculationService.calculateFinancialHealthScore(userId),
      FinancialCalculationService.calculateCategoryTotals(userId, startDate, endDate),
      Transaction.find({ userId, type: 'expense', date: { $gte: startDate, $lte: endDate } })
        .sort({ amount: -1 })
        .limit(5)
        .lean(),
      FinancialCalculationService.calculateBudgetUsage(userId, month, year),
      Transaction.countDocuments({ userId, isAnomaly: true, date: { $gte: startDate, $lte: endDate } }),
      FinancialCalculationService.calculateSubscriptionCost(userId),
    ]);

    const summaryData = {
      totalIncome: income,
      totalExpenses: expenses,
      netSavings,
      savingsRate,
      healthScore: healthData.score,
      topCategories,
      largestTransactions: largestTxns.map((t) => ({
        description: t.description || t.merchant || t.category,
        amount: t.amount,
        category: t.category,
        date: t.date,
      })),
      budgetStatus: budgetData.categories.map((c) => ({
        category: c.category,
        limit: c.limit,
        spent: c.spent,
        percentage: c.percentage,
      })),
      anomaliesCount: anomalies,
      subscriptionTotal: subData.monthlyTotal,
    };

    const aiNarrative = await AIService.generateMonthlyReportNarrative(
      { month, year, summaryData },
      currency
    );

    const reportDoc = await Report.findOneAndUpdate(
      { userId, month, year },
      {
        title: `SpendFlow Financial Intelligence Report - ${month}/${year}`,
        summaryData,
        aiNarrative,
        recommendations: [
          'Maintain regular emergency fund savings transfers.',
          'Review top discretionary category limits.',
          'Audit recurring subscription renewals.',
        ],
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: reportDoc });
  } catch (error) {
    next(error);
  }
};
