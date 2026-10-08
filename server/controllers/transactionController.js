import Transaction from '../models/Transaction.js';
import AIService from '../services/aiService.js';
import AnomalyDetectionService from '../services/anomalyDetectionService.js';
import NotificationService from '../services/notificationService.js';

// @desc    Get all transactions with filtering, searching, and pagination
// @route   GET /api/transactions
export const getTransactions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      search,
      category,
      type,
      startDate,
      endDate,
      paymentMethod,
      isAnomaly,
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = req.query;

    const query = { userId };

    if (type) query.type = type;
    if (category && category !== 'All') query.category = category;
    if (paymentMethod && paymentMethod !== 'All') query.paymentMethod = paymentMethod;
    if (isAnomaly === 'true') query.isAnomaly = true;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { description: regex },
        { merchant: regex },
        { category: regex },
        { notes: regex },
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new transaction (with automated categorization and anomaly detection)
// @route   POST /api/transactions
export const createTransaction = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let {
      amount,
      type = 'expense',
      category,
      subcategory,
      date = new Date(),
      merchant,
      description,
      paymentMethod = 'UPI',
      tags = [],
      recurring = false,
      notes = '',
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount is required' });
    }

    // Auto-categorize if category is missing or default
    if (!category || category === 'Other') {
      const autoCat = await AIService.categorizeTransaction(merchant, description, amount);
      if (autoCat.category) {
        category = autoCat.category;
        if (!subcategory && autoCat.subcategory) subcategory = autoCat.subcategory;
      }
    }

    // Evaluate statistical anomaly
    let isAnomaly = false;
    let anomalyReason = '';
    if (type === 'expense') {
      const anomalyCheck = await AnomalyDetectionService.evaluateTransactionAnomaly(
        userId,
        Number(amount),
        category,
        merchant
      );
      isAnomaly = anomalyCheck.isAnomaly;
      anomalyReason = anomalyCheck.reason;
    }

    const transaction = await Transaction.create({
      userId,
      amount: Number(amount),
      type,
      category,
      subcategory,
      date,
      merchant,
      description,
      paymentMethod,
      tags,
      recurring,
      notes,
      isAnomaly,
      anomalyReason,
    });

    // If anomaly, fire in-app notification
    if (isAnomaly) {
      await NotificationService.createNotification(
        userId,
        'Unusual Spending Flagged ⚠️',
        anomalyReason || `Unusual transaction of ₹${amount} detected in ${category}.`,
        'anomaly',
        { transactionId: transaction._id, amount, category }
      );
    }

    // Background alert checks
    NotificationService.checkSystemAlerts(userId).catch(() => {});

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
export const updateTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const fields = ['amount', 'type', 'category', 'subcategory', 'date', 'merchant', 'description', 'paymentMethod', 'tags', 'recurring', 'notes'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) transaction[f] = req.body[f];
    });

    await transaction.save();
    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
export const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Natural Language Extraction Preview (Before confirmation)
// @route   POST /api/transactions/quick-nl-extract
export const extractExpenseNL = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required' });
    }

    const extraction = await AIService.extractExpense(text, req.user?.currency || 'INR');
    res.json({ success: true, extraction });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk CSV Import with Duplicate Detection
// @route   POST /api/transactions/csv-import
export const importCSV = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { rows, skipDuplicates = true } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid rows provided for import' });
    }

    let inserted = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const amount = parseFloat(row.amount);
      const date = row.date ? new Date(row.date) : new Date();

      if (isNaN(amount) || amount <= 0) {
        errors.push(`Row ${i + 1}: Invalid amount`);
        continue;
      }

      // Duplicate detection check
      if (skipDuplicates) {
        const duplicate = await Transaction.findOne({
          userId,
          amount,
          type: row.type || 'expense',
          merchant: row.merchant || '',
          date: {
            $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
            $lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
          },
        });

        if (duplicate) {
          skipped++;
          continue;
        }
      }

      let category = row.category;
      if (!category || category === 'Other') {
        const autoCat = await AIService.categorizeTransaction(row.merchant, row.description, amount);
        category = autoCat.category || 'Other';
      }

      await Transaction.create({
        userId,
        amount,
        type: row.type || 'expense',
        category,
        merchant: row.merchant || '',
        description: row.description || '',
        paymentMethod: row.paymentMethod || 'UPI',
        date,
      });

      inserted++;
    }

    res.json({
      success: true,
      message: `Successfully imported ${inserted} transactions (${skipped} duplicate(s) skipped).`,
      summary: { inserted, skipped, errorCount: errors.length, errors },
    });
  } catch (error) {
    next(error);
  }
};
