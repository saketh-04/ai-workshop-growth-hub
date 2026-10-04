import { ProjectCategory, ProjectIdea } from '../validators/ai';

// Every fallback outline is exactly 60 minutes.
const outline = (core: string): ProjectIdea['outline'] => [
  { minutes: 5, step: 'Define the user and the one problem you are solving' },
  { minutes: 10, step: 'Set up the project and connect to an LLM API' },
  { minutes: 20, step: `Build the core feature: ${core}` },
  { minutes: 15, step: 'Add a simple interface to try it out' },
  { minutes: 10, step: 'Test with real examples and prepare to share it' },
];

const IDEAS: Record<ProjectCategory, ProjectIdea> = {
  productivity: {
    title: 'Meeting Notes to Action Items',
    oneLiner: 'Paste messy meeting notes and get a clean list of tasks with owners and deadlines.',
    techStack: ['Python or Node.js', 'LLM API', 'Streamlit or simple HTML'],
    difficulty: 'Beginner',
    outline: outline('extract tasks, owners and deadlines from raw notes'),
  },
  education: {
    title: 'Study Buddy Quiz Maker',
    oneLiner: 'Turn any chapter of notes into a short quiz with answers and explanations.',
    techStack: ['Python', 'LLM API', 'Streamlit'],
    difficulty: 'Beginner',
    outline: outline('generate multiple-choice questions from pasted notes'),
  },
  healthcare: {
    title: 'Plain-Language Health Report Explainer',
    oneLiner: 'Explain a lab report in simple words for general understanding, never as medical advice.',
    techStack: ['Python', 'LLM API', 'Streamlit'],
    difficulty: 'Intermediate',
    outline: outline('summarise report values in plain language with a safety disclaimer'),
  },
  finance: {
    title: 'Student Expense Insights Bot',
    oneLiner: 'Upload a month of expenses and get plain-English spending insights and saving tips.',
    techStack: ['Python', 'Pandas', 'LLM API'],
    difficulty: 'Intermediate',
    outline: outline('categorise expenses and generate saving suggestions'),
  },
  career: {
    title: 'Resume Bullet Improver',
    oneLiner: 'Paste a resume bullet and get stronger, measurable versions tailored to a job description.',
    techStack: ['Node.js or Python', 'LLM API', 'React or simple HTML'],
    difficulty: 'Beginner',
    outline: outline('rewrite resume bullets to match a target role'),
  },
  other: {
    title: 'Ask-My-Document Chatbot',
    oneLiner: 'Upload a PDF or text file and ask questions answered only from that document.',
    techStack: ['Python', 'LLM API', 'Streamlit'],
    difficulty: 'Intermediate',
    outline: outline('answer questions grounded in the uploaded document'),
  },
};

export function getFallbackIdea(category: ProjectCategory): ProjectIdea {
  return IDEAS[category];
}
