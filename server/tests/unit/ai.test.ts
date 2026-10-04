import { generateProjectIdea } from '../../src/services/aiService';
import { getFallbackIdea } from '../../src/services/aiFallback';
import { PROJECT_CATEGORIES, projectIdeaSchema } from '../../src/validators/ai';

const goodIdea = {
  title: 'Meeting Summariser',
  oneLiner: 'Summarises meeting notes into action items.',
  techStack: ['Node.js', 'OpenAI API'],
  difficulty: 'Beginner',
  outline: [
    { minutes: 10, step: 'Setup' },
    { minutes: 40, step: 'Build core' },
    { minutes: 10, step: 'Demo' },
  ],
};
const okFetch = (body: unknown, ok = true, status = 200) =>
  (async () => ({ ok, status, json: async () => body })) as unknown as typeof fetch;
const chat = (content: string) => ({ choices: [{ message: { content } }] });
const deps = (fetchFn: typeof fetch) => ({ apiKey: 'sk-test', model: 'm', fetchFn });

beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });

describe('fallback (no OPENAI_API_KEY)', () => {
  it('returns a fallback idea and never calls the network', async () => {
    const fetchFn = vi.fn();
    const out = await generateProjectIdea('career', { model: 'm', fetchFn: fetchFn as unknown as typeof fetch });
    expect(out.source).toBe('fallback');
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it('is deterministic', async () => {
    const a = await generateProjectIdea('finance', { model: 'm' });
    const b = await generateProjectIdea('finance', { model: 'm' });
    expect(a).toEqual(b);
  });
  it.each(PROJECT_CATEGORIES)('has a schema-valid 60-minute idea for "%s"', (c) => {
    expect(projectIdeaSchema.safeParse(getFallbackIdea(c)).success).toBe(true);
  });
});

describe('OpenAI path', () => {
  it('returns the validated OpenAI idea', async () => {
    const out = await generateProjectIdea('career', deps(okFetch(chat(JSON.stringify(goodIdea)))));
    expect(out.source).toBe('openai');
    expect(out.idea.title).toBe('Meeting Summariser');
  });
  it('sends the key as a bearer header and only the category (no free text)', async () => {
    const spy = vi.fn(okFetch(chat(JSON.stringify(goodIdea))));
    await generateProjectIdea('finance', deps(spy as unknown as typeof fetch));
    const [, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    expect(String(init.body)).toContain('Category: finance');
  });
  it.each([
    ['HTTP error', okFetch({}, false, 500)],
    ['non-JSON content', okFetch(chat('not json'))],
    ['empty choices', okFetch({ choices: [] })],
    ['wrong shape', okFetch(chat(JSON.stringify({ title: 'x' })))],
    ['outline not 60 min', okFetch(chat(JSON.stringify({ ...goodIdea, outline: [{ minutes: 5, step: 'a b c' }, { minutes: 5, step: 'a b c' }, { minutes: 5, step: 'a b c' }] })))],
    ['network failure', (async () => { throw new Error('boom'); }) as unknown as typeof fetch],
  ])('falls back on %s', async (_l, fetchFn) => {
    const out = await generateProjectIdea('education', deps(fetchFn));
    expect(out).toEqual({ source: 'fallback', idea: getFallbackIdea('education') });
  });
});
