import { ProjectCategory, ProjectIdea, projectIdeaSchema } from '../validators/ai';
import { getFallbackIdea } from './aiFallback';

export interface AiDeps {
  apiKey?: string;
  model: string;
  fetchFn?: typeof fetch; // injectable so tests never hit the network
}
export interface ProjectIdeaResult {
  source: 'openai' | 'fallback';
  idea: ProjectIdea;
}

const SYSTEM_PROMPT = `You design beginner-friendly AI mini-projects for final-year engineering students attending a 60-minute workshop.
Reply with ONLY a JSON object of this exact shape:
{"title": string, "oneLiner": string, "techStack": string[2-6], "difficulty": "Beginner" | "Intermediate",
 "outline": [{"minutes": integer, "step": string}]}
Rules: outline has 3-8 steps and the minutes add up to exactly 60. The project must be buildable in 60 minutes by a beginner.`;

/**
 * Never throws: any failure (no key, network, timeout, bad JSON, schema mismatch, outline != 60 min)
 * returns the deterministic fallback, so the registration flow can't break because of AI.
 */
export async function generateProjectIdea(category: ProjectCategory, deps: AiDeps): Promise<ProjectIdeaResult> {
  const fallback: ProjectIdeaResult = { source: 'fallback', idea: getFallbackIdea(category) };
  if (!deps.apiKey) return fallback;

  try {
    const res = await (deps.fetchFn ?? fetch)('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deps.apiKey}` },
      body: JSON.stringify({
        model: deps.model,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Category: ${category}. Suggest one project idea.` },
        ],
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) throw new Error(`OpenAI responded ${res.status}`);

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty OpenAI response');

    return { source: 'openai', idea: projectIdeaSchema.parse(JSON.parse(content)) };
  } catch (err) {
    // Log the reason only - never the key or request headers.
    console.warn('[ai] using fallback:', err instanceof Error ? err.message : 'unknown error');
    return fallback;
  }
}
