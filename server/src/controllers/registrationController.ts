import { asyncHandler } from '../utils/asyncHandler';
import { registerStudent } from '../services/registrationService';

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await registerStudent(req.body));
});
