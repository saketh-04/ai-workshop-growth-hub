import { Schema, model } from 'mongoose';

export const Campaign = model(
  'Campaign',
  new Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    targetRegistrations: { type: Number, default: 500 },
    budgetInr: { type: Number, default: 2000 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  }),
);
