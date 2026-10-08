import Transaction from '../models/Transaction.js';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import FinancialCalculationService from './financialCalculationService.js';

export class ForecastService {
  /**
   * Calculate deterministic statistical forecasts
   */
  static async calculateSpendingForecast(userId) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const currentDay = now.getDate();
    const daysRemaining = Math.max(1, daysInMonth - currentDay + 1);

    const { startDate, endDate } = FinancialCalculationService.getMonthDateRange(currentYear, currentMonth);

    // Current month expenses so far
    const spentSoFar = await FinancialCalculationService.calculateExpenses(userId, startDate, endDate);
    const user = await User.findById(userId).lean();
    let monthlyIncome = await FinancialCalculationService.calculateIncome(userId, startDate, endDate);
    if (monthlyIncome === 0 && user?.monthlyIncome) {
      monthlyIncome = user.monthlyIncome;
    }

    // 1. Daily Run-Rate Method
    const dailyRunRate = currentDay > 0 ? spentSoFar / currentDay : 0;
    const projectedDiscretionaryRemaining = dailyRunRate * daysRemaining;

    // Upcoming subscriptions for remainder of month
    const upcomingSubs = await Subscription.find({
      userId,
      status: 'Active',
      nextBillingDate: { $gte: now, $lte: endDate },
    }).lean();
    const upcomingBills = upcomingSubs.reduce((sum, s) => sum + s.amount, 0);

    // Month-End Forecast
    const projectedMonthEndTotal = Math.round((spentSoFar + projectedDiscretionaryRemaining + upcomingBills) * 100) / 100;
    const expectedRemainingBalance = Math.round((monthlyIncome - projectedMonthEndTotal) * 100) / 100;

    // Daily and weekly projections
    const dailyAverage = Math.round(dailyRunRate * 100) / 100;
    const weeklyAverage = Math.round(dailyRunRate * 7 * 100) / 100;

    // 2. Category Level Run-rate breakdown
    const categoryTotals = await FinancialCalculationService.calculateCategoryTotals(userId, startDate, endDate);
    const categoryForecasts = categoryTotals.map((cat) => {
      const catDailyRate = currentDay > 0 ? cat.amount / currentDay : 0;
      const catProjected = Math.round((cat.amount + catDailyRate * daysRemaining) * 100) / 100;
      return {
        category: cat.category,
        currentSpent: cat.amount,
        projectedMonthEnd: catProjected,
        growthExpected: Math.round(((catProjected - cat.amount) / Math.max(1, cat.amount)) * 100),
      };
    });

    // 3. Historical 3-month trend (if available)
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const pastTransactions = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: 'expense',
          date: { $gte: threeMonthsAgo, $lt: startDate },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$date' }, year: { $year: '$date' } },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const historicalMonthlyAvg =
      pastTransactions.length > 0
        ? Math.round((pastTransactions.reduce((acc, p) => acc + p.total, 0) / pastTransactions.length) * 100) / 100
        : spentSoFar;

    return {
      dailyAverage,
      weeklyAverage,
      spentSoFar,
      daysElapsed: currentDay,
      daysRemaining,
      projectedMonthEndTotal,
      monthlyIncome,
      expectedRemainingBalance,
      historicalMonthlyAvg,
      paceStatus:
        projectedMonthEndTotal <= monthlyIncome
          ? 'On Track (Surplus expected)'
          : 'Warning (Projected to exceed monthly income)',
      categoryForecasts,
      confidenceScore: Math.min(95, Math.round(40 + (currentDay / daysInMonth) * 55)), // higher confidence later in month
    };
  }
}

export default ForecastService;
