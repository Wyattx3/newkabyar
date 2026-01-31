# Kay AI (Kabyar) - Complete Project Documentation

## Overview

**Kay AI (Kabyar)** သည် AI-powered educational platform တစ်ခုဖြစ်ပြီး GED, IGCSE, OTHM နှင့် အခြား ကျောင်းသားများအတွက် ဖန်တီးထားသည်။

---

## 1. Tech Stack Summary

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js | 16.x (App Router) |
| Language | TypeScript | 5.7+ |
| Styling | Tailwind CSS + shadcn/ui | 3.4+ |
| Database | PostgreSQL (Supabase) | - |
| ORM | Prisma | 6.1+ |
| Authentication | NextAuth.js | v5-beta |
| State Management | Zustand | 4.5+ |
| AI SDK | Vercel AI SDK | 6.0+ |

### AI Providers
- **OpenAI**: GPT-4, GPT-4o, GPT-3.5
- **Anthropic Claude**: Claude 3.5 Sonnet, Haiku, Opus
- **Google Gemini**: Gemini 2.0, 2.5 Pro/Flash
- **xAI Grok**: Grok 3 Mini, Grok 4 Fast

---

## 2. Project Architecture

### Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   │
│   ├── (dashboard)/              # Protected dashboard
│   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   └── dashboard/
│   │       ├── page.tsx          # Dashboard home
│   │       ├── settings/page.tsx
│   │       ├── plans/page.tsx
│   │       │
│   │       ├── rag/              # RAG & Document Tools
│   │       │   ├── pdf-qa/
│   │       │   ├── quiz-generator/
│   │       │   ├── past-paper/
│   │       │   ├── flashcard-maker/
│   │       │   └── resume-tailor/
│   │       │
│   │       ├── research/         # Research Tools
│   │       │   ├── academic-consensus/
│   │       │   ├── research-gap/
│   │       │   └── job-matcher/
│   │       │
│   │       ├── media/            # Audio/Video Tools
│   │       │   ├── youtube-summarizer/
│   │       │   ├── pdf-podcast/
│   │       │   ├── lecture-organizer/
│   │       │   └── viva-simulator/
│   │       │
│   │       ├── visual/           # Visual Tools
│   │       │   ├── mind-map/
│   │       │   ├── timeline/
│   │       │   ├── flowchart/
│   │       │   └── lab-report/
│   │       │
│   │       └── writing/          # Writing Tools
│   │           ├── image-solve/
│   │           ├── roast-assignment/
│   │           ├── paraphraser/
│   │           ├── humanizer/
│   │           ├── ai-detector/
│   │           ├── code-visualizer/
│   │           ├── explain-error/
│   │           ├── devils-advocate/
│   │           ├── vocabulary-upgrader/
│   │           └── cold-email/
│   │
│   ├── api/                      # API Routes
│   │   ├── ai/                   # Core AI routes
│   │   ├── auth/                 # Auth routes
│   │   ├── tools/                # Tool-specific routes
│   │   ├── user/                 # User management
│   │   └── utils/                # Utility routes
│   │
│   ├── blog/                     # Blog pages
│   ├── tools/                    # Public tool landing pages
│   ├── about/
│   ├── contact/
│   ├── privacy/
│   ├── terms/
│   └── page.tsx                  # Landing page
│
├── components/
│   ├── ads/                      # Advertisement components
│   ├── ai/                       # AI-related components
│   ├── auth/                     # Auth components
│   ├── dashboard/                # Dashboard components
│   ├── layout/                   # Layout (Sidebar)
│   ├── slides/                   # Presentation components
│   ├── tools/                    # Tool shared components
│   └── ui/                       # shadcn/ui components
│
├── hooks/
│   ├── use-chat-history.ts
│   ├── use-persisted-state.ts
│   ├── use-response-history.ts
│   ├── use-toast.ts
│   └── use-user-plan.ts
│
├── lib/
│   ├── ai-providers/             # AI provider integrations
│   │   ├── index.ts              # Main exports & tier config
│   │   ├── openai.ts
│   │   ├── claude.ts
│   │   ├── gemini.ts
│   │   ├── grok.ts
│   │   └── types.ts
│   │
│   ├── integrations/             # Third-party integrations
│   │   ├── search.ts             # Web search
│   │   ├── tts.ts                # Text-to-speech
│   │   └── youtube.ts            # YouTube transcript
│   │
│   ├── vector/                   # Vector database
│   │   ├── pinecone.ts
│   │   └── pgvector.ts
│   │
│   ├── auth.ts                   # NextAuth config
│   ├── credits.ts                # Credits system
│   ├── prisma.ts                 # Prisma client
│   ├── prompts.ts                # AI system prompts
│   ├── tools-registry.ts         # All 25 tools metadata
│   ├── tools-data.ts             # Tool landing page data
│   ├── blog-data.ts              # Blog content
│   ├── humanizer-utils.ts        # Humanizer utilities
│   ├── language-utils.ts         # Language utilities
│   └── utils.ts                  # General utilities
│
└── types/
    └── next-auth.d.ts            # NextAuth type extensions
```

---

## 3. Core Features

### 3.1 Tool Categories (25 Total)

#### RAG & Documents (5 tools)
1. **PDF Q&A Sniper** - Ask questions about uploaded PDFs
2. **Quiz Generator** - Generate quizzes from text/PDF
3. **Past Paper Analyzer** - Analyze exam trends
4. **Flashcard Maker** - Create Anki-compatible flashcards
5. **Resume/CV Tailor** - Tailor resume to job descriptions

#### Research & Search (3 tools)
6. **Academic Consensus** - Find scientific consensus
7. **Research Gap Finder** - Identify research opportunities
8. **Job Description Matcher** - Match skills to jobs

#### Audio & Video (4 tools)
9. **YouTube Summarizer** - Summarize YouTube videos
10. **PDF to Podcast** - Convert documents to podcast scripts
11. **Lecture Organizer** - Organize lecture transcripts
12. **Viva Simulator** - Practice oral exams

#### Visual & Diagrams (4 tools)
13. **Mind Map Generator** - Generate visual mind maps
14. **Interactive Timeline** - Create chronological timelines
15. **Text to Flowchart** - Convert processes to flowcharts
16. **Lab Report Generator** - Generate scientific reports

#### Writing & Helpers (9 tools)
17. **Image to Solution** - Solve problems from photos
18. **Roast My Assignment** - Get harsh feedback
19. **Safe Paraphraser** - Rewrite for clarity
20. **Content Humanizer** - Make AI text human-like
21. **AI Detector** - Check for AI-generated content
22. **Code Logic Visualizer** - Visualize code flow
23. **Explain Error** - Explain error messages
24. **Devil's Advocate** - Generate counter-arguments
25. **Vocabulary Upgrader** - Upgrade academic vocabulary
26. **Cold Email Generator** - Write professional emails

---

### 3.2 Credits System

| Plan | Daily Credits | Features |
|------|---------------|----------|
| Free | 50 | Basic tools, Ads shown |
| Pro | 3500 | All tools, No ads, Super-smart model |
| Unlimited | Unlimited | Everything unlimited |

#### Credit Costs
- Base: 3 credits per 1000 words (minimum 3)
- Pro-smart model: 5 credits minimum
- Super-smart: Free for Pro/Unlimited users

---

### 3.3 AI Model Tiers

| Tier | Model | Provider | Credits | Notes |
|------|-------|----------|---------|-------|
| super-smart | gemini-2.5-pro | Gemini | 0 | Pro/Unlimited only |
| pro-smart | gemini-2.5-flash | Gemini | 5 | Fast & capable |
| normal | grok-3-mini | Grok | 3 | Balanced |
| fast | grok-4-fast | Grok | 3 | Quick reasoning |

---

## 4. Database Schema

### Core Tables

```prisma
model User {
  id               String    @id @default(cuid())
  email            String    @unique
  name             String?
  password         String?
  image            String?
  aiProvider       String    @default("openai")
  
  // Credits System
  dailyCredits     Int       @default(50)
  dailyCreditsUsed Int       @default(0)
  creditsResetAt   DateTime  @default(now())
  plan             String    @default("free") // free, pro, unlimited
  
  // Profile
  dateOfBirth      String?
  school           String?
  major            String?
  educationLevel   String?
  learningStyle    String?
  preferredLanguage String?
  
  // Relations
  usageHistory     Usage[]
  sessions         Session[]
  accounts         Account[]
  conversations    Conversation[]
  documents        Document[]
}

model Usage {
  id        String   @id @default(cuid())
  userId    String
  feature   String
  tokens    Int
  model     String?
  createdAt DateTime @default(now())
}

model Conversation {
  id        String    @id @default(cuid())
  userId    String
  title     String?
  feature   String
  messages  Message[]
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  role           String
  content        String       @db.Text
}

model Document {
  id          String   @id @default(cuid())
  userId      String
  filename    String
  contentType String
  vectorId    String?
  content     String?  @db.Text
  chunks      DocumentChunk[]
}

model DocumentChunk {
  id         String   @id @default(cuid())
  documentId String
  chunkIndex Int
  content    String   @db.Text
  vectorId   String?
}
```

---

## 5. API Routes Reference

### AI Routes (`/api/ai/`)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/ai/chat` | POST | Chat (Answer, Homework, Tutor) |
| `/api/ai/essay` | POST | Essay generation |
| `/api/ai/detect` | POST | AI detection |
| `/api/ai/humanize` | POST | Text humanization |
| `/api/ai/humanize-diff` | POST | Humanize with diff view |
| `/api/ai/presentation` | POST | Presentation outline |
| `/api/ai/slides` | POST | Slide content |
| `/api/ai/study-guide` | POST | Study guide generation |

### Tool Routes (`/api/tools/`)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/tools/pdf-qa` | POST | PDF question answering |
| `/api/tools/quiz` | POST | Quiz generation |
| `/api/tools/flashcard` | POST | Flashcard creation |
| `/api/tools/past-paper` | POST | Past paper analysis |
| `/api/tools/resume` | POST | Resume tailoring |
| `/api/tools/consensus` | POST | Academic consensus |
| `/api/tools/research-gap` | POST | Research gap finding |
| `/api/tools/job-match` | POST | Job matching |
| `/api/tools/youtube` | POST | YouTube summarization |
| `/api/tools/podcast` | POST | PDF to podcast |
| `/api/tools/lecture` | POST | Lecture organization |
| `/api/tools/viva` | POST | Viva simulation |
| `/api/tools/mindmap` | POST | Mind map generation |
| `/api/tools/timeline` | POST | Timeline creation |
| `/api/tools/flowchart` | POST | Flowchart generation |
| `/api/tools/lab-report` | POST | Lab report generation |
| `/api/tools/image-solve` | POST | Image problem solving |
| `/api/tools/roast` | POST | Assignment roasting |
| `/api/tools/paraphrase` | POST | Paraphrasing |
| `/api/tools/code-visual` | POST | Code visualization |
| `/api/tools/error` | POST | Error explanation |
| `/api/tools/advocate` | POST | Counter-arguments |
| `/api/tools/vocab` | POST | Vocabulary upgrade |
| `/api/tools/email` | POST | Cold email generation |

### User Routes (`/api/user/`)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/user/profile` | GET/PUT | User profile |
| `/api/user/credits` | GET | Credits info |
| `/api/user/credits/reward` | POST | Ad reward credits |

---

## 6. Key Implementation Patterns

### 6.1 Creating a New Tool

```typescript
// 1. Add to tools-registry.ts
export const TOOLS: Tool[] = [
  // ... existing tools
  {
    id: 'new-tool',
    slug: 'new-tool',
    name: 'New Tool Name',
    description: 'Tool description',
    shortDescription: 'Short description',
    category: 'writing',
    icon: 'IconName',
    color: 'rose',
    apiEndpoint: '/api/tools/new-tool',
    credits: 3,
    features: ['Feature 1', 'Feature 2'],
    status: 'active',
  },
];

// 2. Create page at src/app/(dashboard)/dashboard/[category]/[slug]/page.tsx

// 3. Create API at src/app/api/tools/[slug]/route.ts
```

### 6.2 Streaming AI Response

```typescript
import { streamWithTier } from "@/lib/ai-providers";
import { checkCredits, deductCredits } from "@/lib/credits";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { content, model = "fast" } = await req.json();
  
  // Check credits
  const check = await checkCredits(session.user.id, model, content.length);
  if (!check.allowed) {
    return Response.json({ error: check.error }, { status: 402 });
  }

  // Deduct BEFORE streaming
  await deductCredits(session.user.id, check.creditsNeeded!, "tool-name", model);

  // Stream response
  const stream = await streamWithTier(model, SYSTEM_PROMPT, content);
  
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
```

### 6.3 Credit Event Dispatch

```typescript
// After credit update, dispatch event for sidebar refresh
window.dispatchEvent(new Event("credits-updated"));
```

---

## 7. Design System

### Colors
- Primary: `#2563eb` (blue-600)
- Background: `#ffffff` (white)
- Text Primary: `#111827` (gray-900)
- Text Secondary: `#4b5563` (gray-600)
- Text Muted: `#9ca3af` (gray-400)

### Critical Rules
- **NO GRADIENTS** - Solid colors only
- **NO AI-like generic UI** - Premium custom design
- Use Tailwind CSS classes
- Border radius: `rounded-xl` or `rounded-2xl`
- Shadows: Subtle (`shadow-sm`, `shadow-lg`)

### Component Examples

```tsx
// Premium Card
<div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow">
  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
    <h3 className="font-medium text-gray-900 text-sm">Card Title</h3>
  </div>
  <div className="p-4">
    {/* Content */}
  </div>
</div>

// Primary Button
<Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20">
  Action <ArrowRight className="ml-2 h-4 w-4" />
</Button>

// Secondary Button
<Button variant="outline" className="border-gray-200 hover:bg-gray-50 rounded-xl">
  Secondary Action
</Button>
```

---

## 8. Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# NextAuth
AUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# AI API Keys
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_AI_API_KEY="AIza..."
GROK_API_KEY="xai-..."

# Google OAuth (optional)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

---

## 9. Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database operations
npm run db:push      # Push schema changes
npm run db:seed      # Seed database
npm run db:reset     # Reset and reseed

# Linting
npm run lint
```

---

## 10. Deployment (Vercel)

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy!

### Important Settings
- Framework: Next.js
- Build command: `npm run build`
- Output: `.next`
- Install command: `npm install`

---

## 11. Troubleshooting

### Credits Not Updating
- Verify `credits-updated` event dispatch
- Check sidebar event listener
- Verify UTC time reset logic

### AI Detection Score High
- Review prompts in `prompts.ts`
- Check banned phrases list
- Use basic vocabulary in humanizer

### Authentication Issues
- Verify `AUTH_SECRET` is set
- Check database connection
- Review NextAuth callbacks

### Grok API Blocked
- Automatic fallback to Gemini
- Check rate limits
- Verify API key

---

**Last Updated**: January 2026
**Version**: 0.1.0
**Repository**: https://github.com/Wyattx3/newkabyar.git
