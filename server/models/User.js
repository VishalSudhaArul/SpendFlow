import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 60,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'AED', 'JPY'],
    },
    monthlyIncome: {
      type: Number,
      default: 0,
      min: 0,
    },
    financialGoal: {
      type: String,
      enum: [
        'Save more',
        'Control spending',
        'Build emergency fund',
        'Reduce unnecessary expenses',
        'Track spending',
        'Buy something specific',
      ],
      default: 'Track spending',
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    themePreference: {
      type: String,
      enum: ['dark', 'light', 'system'],
      default: 'dark',
    },
    notificationPreferences: {
      budgetAlerts: { type: Boolean, default: true },
      unusualSpending: { type: Boolean, default: true },
      billReminders: { type: Boolean, default: true },
      weeklyRecap: { type: Boolean, default: true },
      monthlyReport: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

export default mongoose.model('User', userSchema);
