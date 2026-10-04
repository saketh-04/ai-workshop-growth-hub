import { asyncHandler } from '../utils/asyncHandler';
import { AiDeps, generateProjectIdea } from '../services/aiService';
import { recordEvent } from '../services/analyticsService';

export const projectIdea = (deps: AiDeps) =>
  asyncHandler(async (req, res) => {
    const result = await generateProjectIdea(req.body.category, deps);
    await recordEvent({
      eventType: 'ai_project_generated',
      userId: req.body.userId,
      metadata: { category: req.body.category, source: result.source },
    });
    res.json(result);
  });
