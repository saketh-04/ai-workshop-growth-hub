import { Schema, model } from 'mongoose';

const registrationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    source: { type: String, required: true }, // resolved acquisition channel
    selfReportedSource: { type: String, required: true },
    medium: { type: String },
    campaign: { type: String },
    referralCode: { type: String, default: null }, // only set when the referral was credited
    isDemo: { type: Boolean, default: false }, // seeded demo record (never real student data)
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
registrationSchema.index({ source: 1 });
registrationSchema.index({ createdAt: -1 });
registrationSchema.index({ isDemo: 1 });

export const Registration = model('Registration', registrationSchema);
