import { Schema, model } from 'mongoose';

// One document per successful referral. Link clicks are counted on User.referralClicks.
const referralSchema = new Schema(
  {
    referrerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // unique: a student can be credited to at most one referrer, once.
    referredUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    referralCode: { type: String, required: true },
    converted: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false }, // seeded demo record (never real student data)
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
referralSchema.index({ referrerUserId: 1, createdAt: 1 });

export const Referral = model('Referral', referralSchema);
