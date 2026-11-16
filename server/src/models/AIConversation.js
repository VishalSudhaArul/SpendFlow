import mongoose from 'mongoose';

export const MAX_MESSAGES = 200;

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 6000 },
    // 'ai' = Gemini answered; 'fallback' = deterministic answer (AI unavailable or output rejected).
    source: { type: String, enum: ['user', 'ai', 'fallback'], required: true },
    suggestedQuestions: { type: [String], default: undefined },
    note: { type: String, default: undefined },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } },
);

/** One AI coach conversation, owned by one user. */
const aiConversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, trim: true, maxlength: 80, required: true },
    messages: {
      type: [messageSchema],
      default: [],
      validate: [(list) => list.length <= MAX_MESSAGES, `A conversation can hold at most ${MAX_MESSAGES} messages`],
    },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.userId;
        ret.messages = (ret.messages ?? []).map(({ _id, ...m }) => ({ id: _id.toString(), ...m }));
        return ret;
      },
    },
  },
);

aiConversationSchema.index({ userId: 1, updatedAt: -1 });

export const AIConversation = mongoose.models.AIConversation ?? mongoose.model('AIConversation', aiConversationSchema);

/** Cached AI output (e.g. the daily dashboard summary) so the same request isn't paid for repeatedly. */
const aiInsightSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: ['daily_summary'], required: true },
    key: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    source: { type: String, enum: ['ai', 'fallback'], required: true },
    // Removed automatically by MongoDB a few days after creation.
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
aiInsightSchema.index({ userId: 1, kind: 1, key: 1 }, { unique: true });
aiInsightSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AIInsight = mongoose.models.AIInsight ?? mongoose.model('AIInsight', aiInsightSchema);
