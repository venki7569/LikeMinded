import mongoose from 'mongoose';
import { isAllowedHttpUrl } from '../utils/sanitize.js';

const { Schema, model } = mongoose;

export const EVENT_CATEGORIES = Object.freeze({
  TECHNOLOGY: 'technology',
  WORKSHOP: 'workshop',
  MEETUP: 'meetup',
  HACKATHON: 'hackathon',
  CAREER: 'career',
  WEBINAR: 'webinar',
  SOCIAL: 'social',
  OTHER: 'other',
});

const posterSchema = new Schema(
  {
    url: {
      type: String,
      maxlength: 2048,
      validate: { validator: isAllowedHttpUrl, message: 'url must be a valid http(s) URL' },
    },
    publicId: { type: String, maxlength: 200, default: '' },
  },
  { _id: false }
);

const eventSchema = new Schema(
  {
    host: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    community: {
      type: Schema.Types.ObjectId,
      ref: 'Community',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    category: {
      type: String,
      enum: Object.values(EVENT_CATEGORIES),
      default: EVENT_CATEGORIES.OTHER,
      index: true,
    },
    startsAt: {
      type: Date,
      required: true,
    },
    endsAt: {
      type: Date,
      default: null,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
      default: 'Online',
    },
    poster: {
      type: posterSchema,
      default: null,
    },
    attendees: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    capacity: {
      type: Number,
      default: null,
      min: 1,
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

eventSchema.index({ startsAt: 1 });
eventSchema.index({ category: 1, startsAt: 1 });

export const Event = model('Event', eventSchema);
export default Event;
