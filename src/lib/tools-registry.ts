// Tools Registry - Centralized definitions for all 25 tools
// This file defines the metadata for each tool in the Kay AI suite

export type ToolCategory = 
  | 'rag'       // RAG & Document Intelligence
  | 'research'  // Live Search & Research
  | 'media'     // Audio/Video & Speech
  | 'visual'    // Visual & Structured Output
  | 'writing';  // Writing & Specific Helpers

export interface CategoryMeta {
  id: ToolCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface Tool {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription: string;
  category: ToolCategory;
  icon: string;
  color: string;
  apiEndpoint: string;
  credits: number;
  features: string[];
  requiresUpload?: boolean;
  requiresVision?: boolean;
  requiresVector?: boolean;
  requiresSearch?: boolean;
  requiresAudio?: boolean;
  status: 'active' | 'coming-soon';
}

// Category Metadata
export const TOOL_CATEGORIES: Record<ToolCategory, CategoryMeta> = {
  rag: {
    id: 'rag',
    name: 'RAG & Documents',
    description: 'Upload documents and extract insights with AI-powered analysis',
    icon: 'FileSearch',
    color: 'blue',
  },
  research: {
    id: 'research',
    name: 'Research & Search',
    description: 'Live web search and academic research tools',
    icon: 'Globe',
    color: 'emerald',
  },
  media: {
    id: 'media',
    name: 'Audio & Video',
    description: 'Process multimedia content with AI transcription and analysis',
    icon: 'Video',
    color: 'purple',
  },
  visual: {
    id: 'visual',
    name: 'Visual & Diagrams',
    description: 'Generate mind maps, flowcharts, timelines and structured visuals',
    icon: 'Shapes',
    color: 'amber',
  },
  writing: {
    id: 'writing',
    name: 'Writing & Helpers',
    description: 'Writing assistance, code help, and specialized text tools',
    icon: 'PenTool',
    color: 'rose',
  },
};

// All 25 Tools
export const TOOLS: Tool[] = [
  // ========================================
  // Category 1: RAG & Document Intelligence
  // ========================================
  {
    id: 'pdf-qa',
    slug: 'pdf-qa',
    name: 'PDF Q&A Sniper',
    description: 'Upload any PDF document and ask specific questions. Get precise answers with exact page citations and context extraction.',
    shortDescription: 'Ask questions about your PDFs with page citations',
    category: 'rag',
    icon: 'FileSearch',
    color: 'blue',
    apiEndpoint: '/api/tools/pdf-qa',
    credits: 4,
    features: ['PDF parsing', 'Vector search', 'Page citations', 'Context extraction'],
    requiresUpload: true,
    requiresVector: true,
    status: 'active',
  },
  {
    id: 'quiz-generator',
    slug: 'quiz-generator',
    name: 'Quiz Generator',
    description: 'Transform any text or PDF into interactive quizzes. Generate MCQs, true/false questions, and fill-in-the-blanks automatically.',
    shortDescription: 'Generate quizzes from any text or document',
    category: 'rag',
    icon: 'ClipboardCheck',
    color: 'blue',
    apiEndpoint: '/api/tools/quiz',
    credits: 3,
    features: ['MCQ generation', 'True/False', 'Fill-in-blanks', 'Answer keys'],
    requiresUpload: true,
    status: 'active',
  },
  {
    id: 'past-paper-analyzer',
    slug: 'past-paper',
    name: 'Past Paper Analyzer',
    description: 'Upload multiple years of exam papers to analyze question trends, topic frequency, and predict likely topics for upcoming exams.',
    shortDescription: 'Analyze exam trends and predict future topics',
    category: 'rag',
    icon: 'TrendingUp',
    color: 'blue',
    apiEndpoint: '/api/tools/past-paper',
    credits: 8,
    features: ['Trend analysis', 'Topic frequency', 'Prediction', 'Multi-year comparison'],
    requiresUpload: false,
    requiresVector: false,
    status: 'active',
  },
  {
    id: 'flashcard-maker',
    slug: 'flashcard-maker',
    name: 'Flashcard Maker',
    description: 'Convert any text, notes, or PDF into study flashcards. Export to Anki format for spaced repetition learning.',
    shortDescription: 'Create flashcards from text with Anki export',
    category: 'rag',
    icon: 'Layers',
    color: 'blue',
    apiEndpoint: '/api/tools/flashcard',
    credits: 3,
    features: ['Front/Back cards', 'Anki export', 'Bulk generation', 'Topic grouping'],
    requiresUpload: true,
    status: 'active',
  },
  {
    id: 'resume-tailor',
    slug: 'resume-tailor',
    name: 'Resume/CV Tailor',
    description: 'Upload your CV and a job description. Get AI-powered suggestions to tailor your resume for the specific role.',
    shortDescription: 'Tailor your CV to match job descriptions',
    category: 'rag',
    icon: 'FileUser',
    color: 'blue',
    apiEndpoint: '/api/tools/resume',
    credits: 5,
    features: ['Skill matching', 'Gap analysis', 'Rewrite suggestions', 'ATS optimization'],
    requiresUpload: false,
    status: 'active',
  },

  // ========================================
  // Category 2: Live Search & Research
  // ========================================
  {
    id: 'academic-consensus',
    slug: 'academic-consensus',
    name: 'Academic Consensus',
    description: 'Search academic papers to find scientific consensus on any topic. See what percentage of studies support different conclusions.',
    shortDescription: 'Find scientific consensus from research papers',
    category: 'research',
    icon: 'Scale',
    color: 'emerald',
    apiEndpoint: '/api/tools/consensus',
    credits: 5,
    features: ['Consensus meter', 'Study snapshots', 'Methodology extraction', 'Citation links'],
    requiresSearch: true,
    status: 'active',
  },
  {
    id: 'research-gap',
    slug: 'research-gap',
    name: 'Research Gap Finder',
    description: 'Analyze existing research papers to identify unexplored areas and potential research opportunities in your field.',
    shortDescription: 'Find unexplored research topics',
    category: 'research',
    icon: 'Radar',
    color: 'emerald',
    apiEndpoint: '/api/tools/research-gap',
    credits: 5,
    features: ['Gap identification', 'Literature mapping', 'Trend analysis', 'Opportunity scoring'],
    requiresSearch: true,
    requiresUpload: false,
    status: 'active',
  },
  {
    id: 'job-matcher',
    slug: 'job-matcher',
    name: 'Job Description Matcher',
    description: 'Compare your skills and experience against job requirements. Get a match score and improvement suggestions.',
    shortDescription: 'Match your skills to job requirements',
    category: 'research',
    icon: 'Target',
    color: 'emerald',
    apiEndpoint: '/api/tools/job-match',
    credits: 3,
    features: ['Skill matching', 'Gap analysis', 'Score calculation', 'Improvement tips'],
    requiresUpload: false,
    status: 'active',
  },

  // ========================================
  // Category 3: Audio/Video & Speech
  // ========================================
  {
    id: 'youtube-summarizer',
    slug: 'youtube-summarizer',
    name: 'YouTube Summarizer',
    description: 'Paste any YouTube link to get an AI-generated summary with key moments, timestamps, and structured notes.',
    shortDescription: 'Summarize YouTube videos with timestamps',
    category: 'media',
    icon: 'Youtube',
    color: 'purple',
    apiEndpoint: '/api/tools/youtube',
    credits: 3,
    features: ['Transcript extraction', 'Key moments', 'Timestamp links', 'Structured notes'],
    status: 'active',
  },
  {
    id: 'pdf-to-podcast',
    slug: 'pdf-podcast',
    name: 'PDF to Podcast',
    description: 'Transform any PDF or text into an engaging two-person dialogue podcast script. Perfect for audio learners.',
    shortDescription: 'Convert documents into podcast scripts',
    category: 'media',
    icon: 'Mic',
    color: 'purple',
    apiEndpoint: '/api/tools/podcast',
    credits: 8,
    features: ['Dialogue generation', 'Two speakers', 'Natural conversation', 'Audio export'],
    requiresUpload: false,
    requiresAudio: false,
    status: 'active',
  },
  {
    id: 'lecture-recorder',
    slug: 'lecture-organizer',
    name: 'Lecture Organizer',
    description: 'Transform lecture transcripts into organized notes with key points, definitions, and potential exam questions.',
    shortDescription: 'Organize lecture transcripts into notes',
    category: 'media',
    icon: 'FileAudio',
    color: 'purple',
    apiEndpoint: '/api/tools/lecture',
    credits: 5,
    features: ['Topic segmentation', 'Structured notes', 'Key points', 'Exam questions'],
    requiresUpload: false,
    requiresAudio: false,
    status: 'active',
  },
  {
    id: 'viva-simulator',
    slug: 'viva-simulator',
    name: 'Viva Simulator',
    description: 'Practice for your oral exams with an AI examiner. Get real-time feedback on your answers and communication.',
    shortDescription: 'Practice oral exams with AI examiner',
    category: 'media',
    icon: 'MessageSquare',
    color: 'purple',
    apiEndpoint: '/api/tools/viva',
    credits: 2,
    features: ['Text interaction', 'Real-time feedback', 'Follow-up questions', 'Performance analysis'],
    requiresAudio: false,
    status: 'active',
  },

  // ========================================
  // Category 4: Visual & Structured Output
  // ========================================
  {
    id: 'mind-map',
    slug: 'mind-map',
    name: 'Mind Map Generator',
    description: 'Convert any topic or text into a visual mind map. Perfect for brainstorming and understanding complex subjects.',
    shortDescription: 'Generate visual mind maps from text',
    category: 'visual',
    icon: 'Network',
    color: 'amber',
    apiEndpoint: '/api/tools/mindmap',
    credits: 3,
    features: ['Mermaid diagrams', 'Hierarchy levels', 'Export options', 'Interactive view'],
    status: 'active',
  },
  {
    id: 'timeline',
    slug: 'timeline',
    name: 'Interactive Timeline',
    description: 'Create chronological timelines for any historical topic or project. Visualize events with descriptions and dates.',
    shortDescription: 'Create interactive chronological timelines',
    category: 'visual',
    icon: 'Clock',
    color: 'amber',
    apiEndpoint: '/api/tools/timeline',
    credits: 3,
    features: ['Date ordering', 'Event descriptions', 'Visual timeline', 'Period grouping'],
    status: 'active',
  },
  {
    id: 'flowchart',
    slug: 'flowchart',
    name: 'Text to Flowchart',
    description: 'Convert process descriptions into clear flowcharts. Ideal for algorithms, workflows, and decision trees.',
    shortDescription: 'Convert processes into visual flowcharts',
    category: 'visual',
    icon: 'GitBranch',
    color: 'amber',
    apiEndpoint: '/api/tools/flowchart',
    credits: 3,
    features: ['Auto-layout', 'Decision nodes', 'Export SVG/PNG', 'Edit capability'],
    status: 'active',
  },
  {
    id: 'lab-report',
    slug: 'lab-report',
    name: 'Lab Report Generator',
    description: 'Enter your raw experimental data and get a properly structured scientific lab report with analysis.',
    shortDescription: 'Generate structured lab reports from data',
    category: 'visual',
    icon: 'FlaskConical',
    color: 'amber',
    apiEndpoint: '/api/tools/lab-report',
    credits: 5,
    features: ['IMRaD format', 'Data analysis', 'Graph suggestions', 'Conclusion writing'],
    status: 'active',
  },

  // ========================================
  // Category 5: Writing & Specific Helpers
  // ========================================
  {
    id: 'image-solution',
    slug: 'image-solve',
    name: 'Image to Solution',
    description: 'Upload a photo of any math or science problem. Get a step-by-step solution with explanations.',
    shortDescription: 'Solve problems from photos with step-by-step explanations',
    category: 'writing',
    icon: 'Camera',
    color: 'rose',
    apiEndpoint: '/api/tools/image-solve',
    credits: 5,
    features: ['Vision AI', 'Step-by-step', 'Multiple methods', 'Concept explanation'],
    requiresUpload: true,
    requiresVision: true,
    status: 'active',
  },
  {
    id: 'roast-assignment',
    slug: 'roast-assignment',
    name: 'Roast My Assignment',
    description: 'Get brutally honest feedback on your assignment using a strict academic grading rubric. Know what to improve.',
    shortDescription: 'Get harsh but helpful feedback on your work',
    category: 'writing',
    icon: 'Flame',
    color: 'rose',
    apiEndpoint: '/api/tools/roast',
    credits: 4,
    features: ['Rubric analysis', 'Detailed feedback', 'Improvement points', 'Grade estimate'],
    requiresUpload: false,
    status: 'active',
  },
  {
    id: 'paraphraser',
    slug: 'paraphraser',
    name: 'Safe Paraphraser',
    description: 'Rewrite text for clarity and academic tone while preserving the original meaning. Avoid plagiarism concerns.',
    shortDescription: 'Rewrite text while preserving meaning',
    category: 'writing',
    icon: 'RefreshCw',
    color: 'rose',
    apiEndpoint: '/api/tools/paraphrase',
    credits: 3,
    features: ['Meaning preservation', 'Academic tone', 'Multiple variants', 'Clarity improvement'],
    status: 'active',
  },
  {
    id: 'humanizer',
    slug: 'humanizer',
    name: 'Content Humanizer',
    description: 'Transform AI-generated text into natural, human-sounding content that bypasses AI detection tools.',
    shortDescription: 'Make AI text sound human and undetectable',
    category: 'writing',
    icon: 'Wand2',
    color: 'rose',
    apiEndpoint: '/api/ai/humanize-diff',
    credits: 5,
    features: ['AI bypass', 'Natural flow', 'Tone matching', 'Diff highlighting'],
    status: 'active',
  },
  {
    id: 'ai-detector',
    slug: 'ai-detector',
    name: 'AI Detector',
    description: 'Check if your content appears AI-generated. Get detailed analysis with specific indicators and improvement suggestions.',
    shortDescription: 'Detect AI-generated content with suggestions',
    category: 'writing',
    icon: 'ShieldCheck',
    color: 'rose',
    apiEndpoint: '/api/ai/detect',
    credits: 3,
    features: ['AI/Human score', 'Pattern detection', 'Highlighted phrases', 'Fix suggestions'],
    status: 'active',
  },
  {
    id: 'code-visualizer',
    slug: 'code-visualizer',
    name: 'Code Logic Visualizer',
    description: 'Paste any code snippet to get a visual explanation of the logic flow, variables, and execution path.',
    shortDescription: 'Visualize code logic and execution flow',
    category: 'writing',
    icon: 'Code',
    color: 'rose',
    apiEndpoint: '/api/tools/code-visual',
    credits: 3,
    features: ['Flow diagrams', 'Variable tracking', 'Step-by-step', 'Multiple languages'],
    status: 'active',
  },
  {
    id: 'explain-error',
    slug: 'explain-error',
    name: 'Explain Error',
    description: 'Paste any error log or stack trace. Get a clear explanation of what went wrong and how to fix it.',
    shortDescription: 'Get clear explanations for error messages',
    category: 'writing',
    icon: 'Bug',
    color: 'rose',
    apiEndpoint: '/api/tools/error',
    credits: 3,
    features: ['Error parsing', 'Root cause analysis', 'Fix suggestions', 'Code examples'],
    status: 'active',
  },
  {
    id: 'devils-advocate',
    slug: 'devils-advocate',
    name: "Devil's Advocate",
    description: 'Present your argument and get strong counter-arguments. Perfect for debate prep and thesis strengthening.',
    shortDescription: 'Generate counter-arguments for any position',
    category: 'writing',
    icon: 'Scale',
    color: 'rose',
    apiEndpoint: '/api/tools/advocate',
    credits: 3,
    features: ['Counter-arguments', 'Weakness finding', 'Debate points', 'Rebuttal suggestions'],
    status: 'active',
  },
  {
    id: 'vocabulary-upgrader',
    slug: 'vocabulary-upgrader',
    name: 'Vocabulary Upgrader',
    description: 'Transform simple text into more sophisticated academic writing with advanced vocabulary suggestions.',
    shortDescription: 'Upgrade vocabulary for academic writing',
    category: 'writing',
    icon: 'BookA',
    color: 'rose',
    apiEndpoint: '/api/tools/vocab',
    credits: 3,
    features: ['Synonym suggestions', 'Academic register', 'Context-aware', 'Inline highlights'],
    status: 'active',
  },
  {
    id: 'cold-email',
    slug: 'cold-email',
    name: 'Cold Email Generator',
    description: 'Generate personalized professional emails for internships, networking, or job applications.',
    shortDescription: 'Write professional outreach emails',
    category: 'writing',
    icon: 'Mail',
    color: 'rose',
    apiEndpoint: '/api/tools/email',
    credits: 3,
    features: ['Personalization', 'Multiple templates', 'Professional tone', 'Follow-up variants'],
    status: 'active',
  },
];

// Helper functions
export function getToolBySlug(slug: string): Tool | undefined {
  return TOOLS.find(tool => tool.slug === slug);
}

export function getToolById(id: string): Tool | undefined {
  return TOOLS.find(tool => tool.id === id);
}

export function getToolsByCategory(category: ToolCategory): Tool[] {
  return TOOLS.filter(tool => tool.category === category);
}

export function getAllTools(): Tool[] {
  return TOOLS;
}

export function getActiveTools(): Tool[] {
  return TOOLS.filter(tool => tool.status === 'active');
}

export function getComingSoonTools(): Tool[] {
  return TOOLS.filter(tool => tool.status === 'coming-soon');
}

export function getAllCategories(): CategoryMeta[] {
  return Object.values(TOOL_CATEGORIES);
}

export function getCategoryBySlug(slug: string): CategoryMeta | undefined {
  return TOOL_CATEGORIES[slug as ToolCategory];
}

// Get tool path for routing
export function getToolPath(tool: Tool): string {
  return `/dashboard/${tool.category}/${tool.slug}`;
}

// Get category path for routing
export function getCategoryPath(category: ToolCategory): string {
  return `/dashboard/${category}`;
}
