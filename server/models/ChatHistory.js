import mongoose from 'mongoose';

const chatHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    suggestedActions: [
      {
        label: String,
        action: String,
        payload: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
  }
);

chatHistorySchema.index({ userId: 1, createdAt: 1 });

export default mongoose.model('ChatHistory', chatHistorySchema);
