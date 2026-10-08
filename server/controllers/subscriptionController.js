import Subscription from '../models/Subscription.js';
import FinancialCalculationService from '../services/financialCalculationService.js';
import NotificationService from '../services/notificationService.js';

// @desc    Get all subscriptions with monthly/annual totals and calendar dates
// @route   GET /api/subscriptions
export const getSubscriptions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const load = await FinancialCalculationService.calculateSubscriptionCost(userId);

    // Timeline / upcoming bill list
    const now = new Date();
    const sortedTimeline = [...load.subscriptions].sort(
      (a, b) => new Date(a.nextBillingDate) - new Date(b.nextBillingDate)
    );

    res.json({
      success: true,
      ...load,
      timeline: sortedTimeline,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new subscription
// @route   POST /api/subscriptions
export const createSubscription = async (req, res, next) => {
  try {
    const { name, amount, billingCycle, nextBillingDate, category, status, remindDaysBefore, paymentMethod, notes } = req.body;

    if (!name || !amount || !nextBillingDate) {
      return res.status(400).json({ success: false, message: 'Please provide subscription name, amount, and next billing date' });
    }

    const subscription = await Subscription.create({
      userId: req.user._id,
      name,
      amount: Number(amount),
      billingCycle: billingCycle || 'Monthly',
      nextBillingDate: new Date(nextBillingDate),
      category: category || 'Subscriptions',
      status: status || 'Active',
      remindDaysBefore: remindDaysBefore !== undefined ? Number(remindDaysBefore) : 3,
      paymentMethod: paymentMethod || 'Credit Card',
      notes: notes || '',
    });

    NotificationService.checkSystemAlerts(req.user._id).catch(() => {});

    res.status(201).json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
};

// @desc    Update subscription
// @route   PUT /api/subscriptions/:id
export const updateSubscription = async (req, res, next) => {
  try {
    const sub = await Subscription.findOne({ _id: req.params.id, userId: req.user._id });
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    const fields = ['name', 'amount', 'billingCycle', 'nextBillingDate', 'category', 'status', 'remindDaysBefore', 'paymentMethod', 'notes'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) sub[f] = req.body[f];
    });

    await sub.save();
    res.json({ success: true, data: sub });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete subscription
// @route   DELETE /api/subscriptions/:id
export const deleteSubscription = async (req, res, next) => {
  try {
    const sub = await Subscription.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }
    res.json({ success: true, message: 'Subscription deleted' });
  } catch (error) {
    next(error);
  }
};
