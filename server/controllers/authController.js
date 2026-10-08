import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Income from '../models/Income.js';
import Budget from '../models/Budget.js';
import SavingsGoal from '../models/SavingsGoal.js';
import Subscription from '../models/Subscription.js';
import Notification from '../models/Notification.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'spendflow_jwt_secret_default', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, currency, monthlyIncome, financialGoal } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      currency: currency || 'INR',
      monthlyIncome: monthlyIncome || 0,
      financialGoal: financialGoal || 'Track spending',
      onboardingCompleted: false,
    });

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        monthlyIncome: user.monthlyIncome,
        financialGoal: user.financialGoal,
        onboardingCompleted: user.onboardingCompleted,
        themePreference: user.themePreference,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        monthlyIncome: user.monthlyIncome,
        financialGoal: user.financialGoal,
        onboardingCompleted: user.onboardingCompleted,
        themePreference: user.themePreference,
        notificationPreferences: user.notificationPreferences,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { name, currency, monthlyIncome, financialGoal, themePreference, notificationPreferences } = req.body;

    if (name) user.name = name;
    if (currency) user.currency = currency;
    if (monthlyIncome !== undefined) user.monthlyIncome = monthlyIncome;
    if (financialGoal) user.financialGoal = financialGoal;
    if (themePreference) user.themePreference = themePreference;
    if (notificationPreferences) user.notificationPreferences = notificationPreferences;

    await user.save();

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        monthlyIncome: user.monthlyIncome,
        financialGoal: user.financialGoal,
        onboardingCompleted: user.onboardingCompleted,
        themePreference: user.themePreference,
        notificationPreferences: user.notificationPreferences,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete Onboarding
// @route   POST /api/auth/onboarding
export const completeOnboarding = async (req, res, next) => {
  try {
    const { currency, monthlyIncome, financialGoal, initialBudgetLimits, sampleData } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (currency) user.currency = currency;
    if (monthlyIncome) user.monthlyIncome = Number(monthlyIncome);
    if (financialGoal) user.financialGoal = financialGoal;
    user.onboardingCompleted = true;
    await user.save();

    // Create initial monthly income entry
    if (monthlyIncome > 0) {
      await Income.create({
        userId,
        amount: Number(monthlyIncome),
        source: 'Salary',
        date: new Date(),
        recurring: true,
        description: 'Monthly Base Income',
      });
    }

    // Set initial budgets if provided
    if (initialBudgetLimits && Array.isArray(initialBudgetLimits)) {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      for (const b of initialBudgetLimits) {
        if (b.category && b.limit > 0) {
          await Budget.findOneAndUpdate(
            { userId, month, year, category: b.category },
            { limit: b.limit, alertThreshold: 80 },
            { upsert: true, new: true }
          );
        }
      }
    }

    // Optionally populate realistic sample demo data for immediate WOW effect
    if (sampleData) {
      await seedDemoDataForUser(userId, user.currency, user.monthlyIncome || 50000);
    }

    res.json({ success: true, message: 'Onboarding completed successfully', user });
  } catch (error) {
    next(error);
  }
};

// Helper to seed realistic demo data for first time users
const seedDemoDataForUser = async (userId, currency, income) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Transactions
  const demoTransactions = [
    { amount: 450, category: 'Food', merchant: 'Swiggy', description: 'Dinner delivery with friends', paymentMethod: 'UPI', date: new Date(currentYear, currentMonth, 2) },
    { amount: 1200, category: 'Food', merchant: 'Supermarket Store', description: 'Weekly groceries & essentials', paymentMethod: 'Credit Card', date: new Date(currentYear, currentMonth, 4) },
    { amount: 280, category: 'Transport', merchant: 'Uber', description: 'Ride to office', paymentMethod: 'UPI', date: new Date(currentYear, currentMonth, 5) },
    { amount: 3200, category: 'Shopping', merchant: 'Amazon', description: 'Wireless mechanical keyboard', paymentMethod: 'Credit Card', date: new Date(currentYear, currentMonth, 7) },
    { amount: 649, category: 'Subscriptions', merchant: 'Netflix', description: 'Monthly Premium Plan', paymentMethod: 'Credit Card', date: new Date(currentYear, currentMonth, 8), recurring: true },
    { amount: 350, category: 'Food', merchant: 'Starbucks Coffee', description: 'Coffee & croissant meetup', paymentMethod: 'UPI', date: new Date(currentYear, currentMonth, 10) },
    { amount: 1500, category: 'Bills', merchant: 'Electricity Board', description: 'Monthly power utility bill', paymentMethod: 'Net Banking', date: new Date(currentYear, currentMonth, 12) },
    { amount: 800, category: 'Health', merchant: 'Apollo Pharmacy', description: 'Vitamins and health supplements', paymentMethod: 'UPI', date: new Date(currentYear, currentMonth, 14) },
  ];

  for (const t of demoTransactions) {
    await Transaction.create({ ...t, userId });
  }

  // Subscriptions
  await Subscription.create([
    { userId, name: 'Netflix', amount: 649, billingCycle: 'Monthly', nextBillingDate: new Date(currentYear, currentMonth + 1, 8), category: 'Entertainment' },
    { userId, name: 'Spotify Premium', amount: 119, billingCycle: 'Monthly', nextBillingDate: new Date(currentYear, currentMonth + 1, 15), category: 'Entertainment' },
    { userId, name: 'Amazon Prime', amount: 1499, billingCycle: 'Yearly', nextBillingDate: new Date(currentYear + 1, currentMonth, 20), category: 'Shopping' },
  ]);

  // Savings Goal
  await SavingsGoal.create({
    userId,
    goalName: 'MacBook Pro M3 Fund',
    category: 'Laptop',
    targetAmount: 120000,
    currentAmount: 45000,
    targetDate: new Date(currentYear, currentMonth + 5, 30),
    priority: 'High',
  });

  // Welcome Notification
  await Notification.create({
    userId,
    title: 'Welcome to SpendFlow AI! 🚀',
    message: 'Your personal financial intelligence companion is active and tracking your cash flow.',
    type: 'system',
  });
};
