import { Schema, model } from 'mongoose';

const schema = new Schema({
  experimentId: { type: Schema.Types.ObjectId, ref: 'Experiment', required: true },
  variantKey: { type: String, required: true },
  eventType: { type: String, enum: ['impression', 'click', 'conversion'], required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
});
schema.index({ experimentId: 1, variantKey: 1, eventType: 1 });

export const ExperimentEvent = model('ExperimentEvent', schema);
