import Notification from '../models/Notification.js';
import Subscription from '../models/Subscription.js';
import Budget from '../models/Budget.js';
import SavingsGoal from '../models/SavingsGoal.js';
import FinancialCalculationService from './financialCalculationService.js';

export class NotificationService {
  /**
   * Create a single notification safely
   */
  static async createNotification(userId, title, message, type, data = {}) {
    try {
      // Avoid spamming duplicate identical unread notifications
      const existing = await Notification.findOne({
        userId,
        title,
        read: false,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });

      if (!existing) {
        return await Notification.create({
          userId,
          title,
          message,
          type,
          data,
        });
      }
      return existing;
    } catch (e) {
      console.error('[NotificationService] Error creating notification:', e.message);
      return null;
    }
  }

  /**
   * Run background checks for budget alerts and upcoming bills
   */
  static async checkSystemAlerts(userId) {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // 1. Check Budget Alerts
      const budgetData = await FinancialCalculationService.calculateBudgetUsage(userId, currentMonth, currentYear);
      for (const cat of budgetData.categories) {
        if (cat.status === 'Exceeded') {
          await this.createNotification(
            userId,
            `Budget Exceeded: ${cat.category}`,
            `You have exceeded your ${cat.category} budget limit of ₹${cat.limit.toLocaleString()} by ₹${(cat.spent - cat.limit).toLocaleString()}.`,
            'budget_exceeded',
            { category: cat.category, spent: cat.spent, limit: cat.limit }
          );
        } else if (cat.status === 'Approaching Limit' || cat.status === 'Almost Exceeded') {
          await this.createNotification(
            userId,
            `Budget Warning: ${cat.category}`,
            `You have used ${cat.percentage}% of your ${cat.category} budget (₹${cat.spent.toLocaleString()} of ₹${cat.limit.toLocaleString()}).`,
            'budget_warning',
            { category: cat.category, spent: cat.spent, limit: cat.limit }
          );
        }
      }

      // 2. Check Upcoming Bills in next 3 days
      const inThreeDays = new Date();
      inThreeDays.setDate(inThreeDays.getDate() + 3);

      const upcomingBills = await Subscription.find({
        userId,
        status: 'Active',
        nextBillingDate: { $gte: now, $lte: inThreeDays },
      }).lean();

      for (const bill of upcomingBills) {
        const daysLeft = Math.max(0, Math.ceil((new Date(bill.nextBillingDate) - now) / (1000 * 60 * 60 * 24)));
        const dueText = daysLeft === 0 ? 'today' : `in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`;

        await this.createNotification(
          userId,
          `Bill Due Soon: ${bill.name}`,
          `Your subscription for ${bill.name} (₹${bill.amount.toLocaleString()}) is due ${dueText}.`,
          'bill_due',
          { subscriptionId: bill._id, amount: bill.amount, nextBillingDate: bill.nextBillingDate }
        );
      }

      // 3. Check Savings Goal Milestones (e.g. 50%, 75%, 100%)
      const goals = await SavingsGoal.find({ userId }).lean();
      for (const goal of goals) {
        if (goal.targetAmount > 0) {
          const pct = Math.round((goal.currentAmount / goal.targetAmount) * 100);
          if (pct >= 100 && !goal.isCompleted) {
            await this.createNotification(
              userId,
              `Goal Achieved: ${goal.goalName}! 🎉`,
              `Congratulations! You have reached your target of ₹${goal.targetAmount.toLocaleString()} for ${goal.goalName}.`,
              'milestone',
              { goalId: goal._id, targetAmount: goal.targetAmount }
            );
          }
        }
      }
    } catch (e) {
      console.error('[NotificationService] Error in checkSystemAlerts:', e.message);
    }
  }
}

export default NotificationService;
