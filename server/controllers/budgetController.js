import Budget from '../models/Budget.js';
import User from '../models/User.js';
import FinancialCalculationService from '../services/financialCalculationService.js';
import AIService from '../services/aiService.js';
import NotificationService from '../services/notificationService.js';

// @desc    Get all budgets with live usage for current/specified month
// @route   GET /api/budgets
export const getBudgets = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();

    const budgetUsage = await FinancialCalculationService.calculateBudgetUsage(userId, month, year);

    res.json({
      success: true,
      month,
      year,
      ...budgetUsage,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or update a budget limit
// @route   POST /api/budgets
export const setBudget = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      category,
      limit,
      month = new Date().getMonth() + 1,
      year = new Date().getFullYear(),
      alertThreshold = 80,
    } = req.body;

    if (!category || !limit || limit <= 0) {
      return res.status(400).json({ success: false, message: 'Valid category and limit amount are required' });
    }

    const budget = await Budget.findOneAndUpdate(
      { userId, month: Number(month), year: Number(year), category },
      { limit: Number(limit), alertThreshold: Number(alertThreshold) },
      { upsert: true, new: true }
    );

    // Refresh notification triggers
    NotificationService.checkSystemAlerts(userId).catch(() => {});

    res.status(200).json({ success: true, data: budget });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a budget
// @route   DELETE /api/budgets/:id
export const deleteBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget limit not found' });
    }
    res.json({ success: true, message: 'Budget removed' });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate AI Budget Allocation Recommendations
// @route   POST /api/budgets/ai-recommend
export const getAIBudgetRecommendation = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).lean();

    const { startDate, endDate } = FinancialCalculationService.getMonthDateRange();
    let income = await FinancialCalculationService.calculateIncome(userId, startDate, endDate);
    if (income === 0 && user?.monthlyIncome) {
      income = user.monthlyIncome;
    }
    if (income === 0) {
      income = 50000; // default benchmark
    }

    const historicalCategories = await FinancialCalculationService.calculateCategoryTotals(userId, startDate, endDate);

    const recommendation = await AIService.generateBudgetRecommendation(
      income,
      historicalCategories,
      user?.financialGoal || 'Save more',
      user?.currency || 'INR'
    );

    res.json({ success: true, recommendation });
  } catch (error) {
    next(error);
  }
};
