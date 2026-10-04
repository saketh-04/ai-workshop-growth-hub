import { asyncHandler } from '../utils/asyncHandler';
import * as experiments from '../services/experimentService';

export const list = asyncHandler(async (_req, res) => { res.json({ experiments: await experiments.listExperiments() }); });
export const create = asyncHandler(async (req, res) => { res.status(201).json(await experiments.createExperiment(req.body)); });
export const get = asyncHandler(async (req, res) => { res.json(await experiments.getExperiment(req.params.id)); });
export const recordEvent = asyncHandler(async (req, res) => {
  await experiments.recordExperimentEvent(req.params.id, req.body);
  res.status(201).json({ recorded: true });
});
export const listActive = asyncHandler(async (_req, res) => { res.json({ experiments: await experiments.listActiveExperiments() }); });
export const setStatus = asyncHandler(async (req, res) => { res.json(await experiments.updateExperimentStatus(req.params.id, req.body.status)); });
