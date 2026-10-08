import Income from '../models/Income.js';

// @desc    Get all income entries for user
// @route   GET /api/income
export const getIncomes = async (req, res, next) => {
  try {
    const incomes = await Income.find({ userId: req.user._id }).sort({ date: -1 }).lean();
    res.json({ success: true, data: incomes });
  } catch (error) {
    next(error);
  }
};

// @desc    Add new income stream
// @route   POST /api/income
export const createIncome = async (req, res, next) => {
  try {
    const { amount, source, date, recurring, recurrenceInterval, description } = req.body;

    if (!amount || amount <= 0 || !source) {
      return res.status(400).json({ success: false, message: 'Valid amount and source are required' });
    }

    const income = await Income.create({
      userId: req.user._id,
      amount: Number(amount),
      source,
      date: date || new Date(),
      recurring: Boolean(recurring),
      recurrenceInterval: recurrenceInterval || 'monthly',
      description: description || '',
    });

    res.status(201).json({ success: true, data: income });
  } catch (error) {
    next(error);
  }
};

// @desc    Update income entry
// @route   PUT /api/income/:id
export const updateIncome = async (req, res, next) => {
  try {
    const income = await Income.findOne({ _id: req.params.id, userId: req.user._id });
    if (!income) {
      return res.status(404).json({ success: false, message: 'Income entry not found' });
    }

    const fields = ['amount', 'source', 'date', 'recurring', 'recurrenceInterval', 'description'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) income[f] = req.body[f];
    });

    await income.save();
    res.json({ success: true, data: income });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete income entry
// @route   DELETE /api/income/:id
export const deleteIncome = async (req, res, next) => {
  try {
    const income = await Income.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!income) {
      return res.status(404).json({ success: false, message: 'Income entry not found' });
    }
    res.json({ success: true, message: 'Income entry deleted' });
  } catch (error) {
    next(error);
  }
};
