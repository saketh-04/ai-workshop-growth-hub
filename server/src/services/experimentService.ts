import { Types } from 'mongoose';
import { Experiment } from '../models/Experiment';
import { ExperimentEvent } from '../models/ExperimentEvent';
import { AppError } from '../utils/errors';
import { CreateExperimentInput } from '../validators/experiment';
import { SIMULATED_LABEL } from './analyticsRules';
import { recordEvent } from './analyticsService';
import { ExperimentStatus, VariantCounts, buildVariantStats, canTransition, evaluateExperiment } from './experimentRules';

type ExperimentLean = NonNullable<Awaited<ReturnType<typeof findLean>>>;
const findLean = (id: string) => Experiment.findById(id).lean();

function toView(e: ExperimentLean, counts: VariantCounts) {
  const variants = buildVariantStats(e.variants, counts);
  return {
    id: String(e._id),
    name: e.name,
    hypothesis: e.hypothesis,
    description: e.description,
    status: e.status,
    startDate: e.startDate ?? null,
    endDate: e.endDate ?? null,
    isSimulated: e.isSimulated,
    label: e.isSimulated ? SIMULATED_LABEL : null,
    variants,
    readout: evaluateExperiment(variants, { simulated: e.isSimulated }),
  };
}

/** One aggregation for any number of experiments (no N+1). */
async function countsByExperiment(ids: Types.ObjectId[]): Promise<Map<string, VariantCounts>> {
  const rows = await ExperimentEvent.aggregate<{ _id: { e: Types.ObjectId; v: string; t: 'impression' | 'click' | 'conversion' }; n: number }>([
    { $match: { experimentId: { $in: ids } } },
    { $group: { _id: { e: '$experimentId', v: '$variantKey', t: '$eventType' }, n: { $sum: 1 } } },
  ]);
  const out = new Map<string, VariantCounts>();
  for (const r of rows) {
    const key = String(r._id.e);
    const counts = out.get(key) ?? {};
    (counts[r._id.v] ??= {})[r._id.t] = r.n;
    out.set(key, counts);
  }
  return out;
}

export async function createExperiment(input: CreateExperimentInput) {
  const startDate = input.startDate ?? (input.status === 'running' ? new Date() : undefined);
  const doc = await Experiment.create({ ...input, startDate, isSimulated: false });
  return toView(doc.toObject() as ExperimentLean, {});
}

export async function listExperiments() {
  const experiments = await Experiment.find().sort({ createdAt: -1 }).lean();
  const counts = await countsByExperiment(experiments.map((e) => e._id));
  return experiments.map((e) => toView(e, counts.get(String(e._id)) ?? {}));
}

export async function getExperiment(id: string) {
  const e = await findLean(id);
  if (!e) throw new AppError(404, 'EXPERIMENT_NOT_FOUND', 'Experiment not found');
  const counts = await countsByExperiment([e._id]);
  return toView(e, counts.get(String(e._id)) ?? {});
}

export async function recordExperimentEvent(
  id: string,
  input: { variantKey: string; eventType: 'impression' | 'click' | 'conversion'; userId?: string },
) {
  const e = await findLean(id);
  if (!e) throw new AppError(404, 'EXPERIMENT_NOT_FOUND', 'Experiment not found');
  if (e.isSimulated) throw new AppError(409, 'EXPERIMENT_SIMULATED', 'Simulated experiments do not accept live events');
  if (e.status !== 'running') throw new AppError(409, 'EXPERIMENT_NOT_RUNNING', 'Experiment is not running');
  if (!e.variants.some((v) => v.key === input.variantKey)) throw new AppError(400, 'UNKNOWN_VARIANT', 'Unknown variant for this experiment');

  await ExperimentEvent.create({ experimentId: e._id, variantKey: input.variantKey, eventType: input.eventType, userId: input.userId });
  if (input.eventType !== 'click') {
    await recordEvent({
      eventType: input.eventType === 'impression' ? 'experiment_impression' : 'experiment_conversion',
      userId: input.userId,
      metadata: { experimentId: String(e._id), variantKey: input.variantKey },
    });
  }
}

/** What the public site needs to run a live test: only running, non-simulated experiments, no stats. */
export async function listActiveExperiments() {
  const rows = await Experiment.find({ status: 'running', isSimulated: false }).sort({ createdAt: -1 }).lean();
  return rows.map((e) => ({ id: String(e._id), name: e.name, variants: e.variants.map((v) => ({ key: v.key, label: v.label })) }));
}

/** Start (draft -> running) or stop (running -> completed) a real experiment. Simulated demo experiments are read-only. */
export async function updateExperimentStatus(id: string, status: ExperimentStatus) {
  const e = await findLean(id);
  if (!e) throw new AppError(404, 'EXPERIMENT_NOT_FOUND', 'Experiment not found');
  if (e.isSimulated) throw new AppError(409, 'EXPERIMENT_SIMULATED', 'Simulated experiments cannot be started or stopped');
  if (!canTransition(e.status, status)) throw new AppError(409, 'INVALID_TRANSITION', `Cannot change an experiment from ${e.status} to ${status}`);
  const now = new Date();
  await Experiment.updateOne({ _id: e._id }, status === 'running' ? { status, startDate: e.startDate ?? now } : { status, endDate: now });
  return getExperiment(id);
}
