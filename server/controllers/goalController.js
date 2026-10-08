import SavingsGoal from '../models/SavingsGoal.js';
import NotificationService from '../services/notificationService.js';

// @desc    Get all savings goals with calculated monthly pace
// @route   GET /api/goals
export const getGoals = async (req, res, next) => {
  try {
    const goals = await SavingsGoal.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();

    const now = new Date();
    const enrichedGoals = goals.map((g) => {
      const remainingAmount = Math.max(0, g.targetAmount - g.currentAmount);
      const progressPercent = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
      const daysLeft = Math.max(1, Math.ceil((new Date(g.targetDate) - now) / (1000 * 60 * 60 * 24)));
      const monthsLeft = Math.max(1, Math.ceil(daysLeft / 30));
      const requiredMonthly = Math.round((remainingAmount / monthsLeft) * 100) / 100;

      return {
        ...g,
        remainingAmount,
        progressPercent,
        daysLeft,
        monthsLeft,
        requiredMonthly,
      };
    });

    res.json({ success: true, data: enrichedGoals });
  } catch (error) {
    next(error);
  }
};

// @desc    Create savings goal
// @route   POST /api/goals
export const createGoal = async (req, res, next) => {
  try {
    const { goalName, category, targetAmount, currentAmount = 0, targetDate, priority = 'Medium' } = req.body;

    if (!goalName || !targetAmount || !targetDate) {
      return res.status(400).json({ success: false, message: 'Please provide goal name, target amount, and target date' });
    }

    const goal = await SavingsGoal.create({
      userId: req.user._id,
      goalName,
      category: category || 'General Savings',
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount),
      targetDate: new Date(targetDate),
      priority,
      history: currentAmount > 0 ? [{ amount: Number(currentAmount), note: 'Initial deposit' }] : [],
    });

    res.status(201).json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
};

// @desc    Add funds / contribute to goal
// @route   POST /api/goals/:id/contribute
export const contributeToGoal = async (req, res, next) => {
  try {
    const { amount, note = '' } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive contribution amount is required' });
    }

    const goal = await SavingsGoal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Savings goal not found' });
    }

    goal.currentAmount += Number(amount);
    goal.history.push({
      amount: Number(amount),
      date: new Date(),
      note: note || `Contribution added`,
    });

    if (goal.currentAmount >= goal.targetAmount) {
      goal.isCompleted = true;
      await NotificationService.createNotification(
        req.user._id,
        `Goal Milestone Achieved! 🎉`,
        `You have fully funded your goal: ${goal.goalName} with ₹${goal.currentAmount.toLocaleString()}!`,
        'milestone',
        { goalId: goal._id }
      );
    }

    await goal.save();
    res.json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
};

// @desc    Update goal details
// @route   PUT /api/goals/:id
export const updateGoal = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    const fields = ['goalName', 'category', 'targetAmount', 'currentAmount', 'targetDate', 'priority', 'isCompleted'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) goal[f] = req.body[f];
    });

    await goal.save();
    res.json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete goal
// @route   DELETE /api/goals/:id
export const deleteGoal = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }
    res.json({ success: true, message: 'Goal deleted' });
  } catch (error) {
    next(error);
  }
};
