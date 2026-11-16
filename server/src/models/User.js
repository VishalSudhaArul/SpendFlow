import mongoose from 'mongoose';

export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      maxlength: 254,
      unique: true,
    },
    // Never returned by queries unless explicitly requested with .select('+passwordHash').
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    currency: {
      type: String,
      enum: SUPPORTED_CURRENCIES,
      default: 'INR',
    },
    // Incremented on password change / "log out everywhere". Tokens carrying an
    // older version are rejected, so old sessions stop working immediately.
    tokenVersion: {
      type: Number,
      default: 0,
      select: false,
    },
    lastLoginAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.passwordHash;
        delete ret.tokenVersion;
        return ret;
      },
    },
  },
);

export const User = mongoose.models.User ?? mongoose.model('User', userSchema);
