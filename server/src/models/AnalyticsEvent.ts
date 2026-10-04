import { Schema, model } from 'mongoose';

const schema = new Schema({
  eventType: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  source: { type: String },
  metadata: { type: Schema.Types.Mixed },
  isDemo: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});
schema.index({ eventType: 1, timestamp: -1 });
schema.index({ source: 1 });

export const AnalyticsEvent = model('AnalyticsEvent', schema);
