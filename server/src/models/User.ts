import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    // Alias-proof key (see utils/email.ts). The unique index here is the real duplicate guard.
    canonicalEmail: { type: String, required: true, unique: true },
    college: { type: String, required: true, trim: true },
    branch: { type: String, required: true, trim: true },
    graduationYear: { type: Number, required: true },
    phone: { type: String },
    referralCode: { type: String, required: true, unique: true },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    referralClicks: { type: Number, default: 0 },
    isDemo: { type: Boolean, default: false }, // seeded demo record (never real student data)
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
userSchema.index({ createdAt: -1 });
userSchema.index({ isDemo: 1 });

export const User = model('User', userSchema);
