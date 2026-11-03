import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const REPORT_REASONS = Object.freeze({
  SPAM: 'spam',
  HARASSMENT: 'harassment',
  HATE_SPEECH: 'hate_speech',
  MISINFORMATION: 'misinformation',
  OTHER: 'other',
});

export const REPORT_STATUS = Object.freeze({
  PENDING: 'pending',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
});

const reportSchema = new Schema(
  {
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['post', 'comment', 'user', 'community'],
      required: true,
      index: true,
    },
    targetId: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      enum: Object.values(REPORT_REASONS),
      default: REPORT_REASONS.OTHER,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    status: {
      type: String,
      enum: Object.values(REPORT_STATUS),
      default: REPORT_STATUS.PENDING,
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolutionNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret.id ?? ret._id?.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

reportSchema.index({ status: 1, createdAt: -1 });

export const Report = model('Report', reportSchema);
export default Report;
