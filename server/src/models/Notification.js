import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = ['bill_due', 'bill_overdue', 'budget_warning', 'budget_over', 'goal_reached', 'unusual_expense'];

/**
 * In-app notification. `dedupeKey` makes generation idempotent: the same event
 * (e.g. "bill X is due") is created once, and its read state is kept.
 */
const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
    title: { type: String, required: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 300 },
    link: { type: String, maxlength: 120, default: null },
    dedupeKey: { type: String, required: true, maxlength: 160 },
    readAt: { type: Date, default: null },
    // Old notifications are removed automatically by MongoDB.
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.userId;
        delete ret.dedupeKey;
        delete ret.expiresAt;
        return ret;
      },
    },
  },
);

notificationSchema.index({ userId: 1, dedupeKey: 1 }, { unique: true });
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Notification = mongoose.models.Notification ?? mongoose.model('Notification', notificationSchema);
