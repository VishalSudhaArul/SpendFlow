import User from '../models/User.js';
import FinancialCalculationService from '../services/financialCalculationService.js';
import AIService from '../services/aiService.js';

// @desc    Simulate financial what-if scenario deterministically
// @route   POST /api/what-if/simulate
export const simulateWhatIf = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { scenarioType, changeAmount, targetCategory } = req.body;

    if (!scenarioType || changeAmount === undefined || isNaN(changeAmount)) {
      return res.status(400).json({ success: false, message: 'Valid scenario type and amount are required' });
    }

    const numAmount = Number(changeAmount);
    const user = await User.findById(userId).lean();
    const currency = user?.currency || 'INR';

    const { startDate, endDate } = FinancialCalculationService.getMonthDateRange();
    let currentIncome = await FinancialCalculationService.calculateIncome(userId, startDate, endDate);
    if (currentIncome === 0 && user?.monthlyIncome) {
      currentIncome = user.monthlyIncome;
    }
    if (currentIncome === 0) currentIncome = 50000;

    const currentExpenses = await FinancialCalculationService.calculateExpenses(userId, startDate, endDate);
    const currentSavings = Math.max(0, currentIncome - currentExpenses);
    const currentSavingsRate = currentIncome > 0 ? Math.round((currentSavings / currentIncome) * 100) : 0;

    let projectedIncome = currentIncome;
    let projectedExpenses = currentExpenses;

    switch (scenarioType) {
      case 'income_increase':
        projectedIncome += numAmount;
        break;
      case 'income_decrease':
        projectedIncome = Math.max(0, currentIncome - numAmount);
        break;
      case 'reduce_expense':
        projectedExpenses = Math.max(0, currentExpenses - numAmount);
        break;
      case 'increase_expense':
      case 'one_time_purchase':
      case 'rent_increase':
        projectedExpenses += numAmount;
        break;
      case 'increase_savings':
        projectedExpenses = Math.max(0, currentExpenses - numAmount);
        break;
      default:
        projectedExpenses += numAmount;
    }

    const projectedSavings = Math.max(0, projectedIncome - projectedExpenses);
    const projectedSavingsRate = projectedIncome > 0 ? Math.round((projectedSavings / projectedIncome) * 100) : 0;
    const difference = projectedSavings - currentSavings;

    // AI Explanation based strictly on calculated values
    const aiExplanation = await AIService.explainWhatIfScenario(
      {
        scenarioType,
        changeAmount: numAmount,
        currentSavings,
        projectedSavings,
        difference,
      },
      currency
    );

    res.json({
      success: true,
      simulation: {
        scenarioType,
        changeAmount: numAmount,
        targetCategory: targetCategory || 'General',
        current: {
          monthlyIncome: currentIncome,
          monthlyExpenses: currentExpenses,
          monthlySavings: currentSavings,
          savingsRate: currentSavingsRate,
        },
        projected: {
          monthlyIncome: projectedIncome,
          monthlyExpenses: projectedExpenses,
          monthlySavings: projectedSavings,
          savingsRate: projectedSavingsRate,
        },
        difference: {
          monthlySavingsDifference: difference,
          savingsRateChange: projectedSavingsRate - currentSavingsRate,
          annualProjectedImpact: difference * 12,
        },
        explanation: aiExplanation.explanation,
      },
    });
  } catch (error) {
    next(error);
  }
};
