import { Schema, model } from 'mongoose';

export const Experiment = model(
  'Experiment',
  new Schema(
    {
      name: { type: String, required: true },
      hypothesis: { type: String, default: '' },
      description: { type: String, default: '' },
      isSimulated: { type: Boolean, default: false }, // seeded demo experiment: results are illustrative only
      variants: [{ _id: false, key: { type: String, required: true }, label: { type: String, required: true } }],
      status: { type: String, enum: ['draft', 'running', 'completed'], default: 'draft' },
      startDate: Date,
      endDate: Date,
    },
    { timestamps: true },
  ),
);
