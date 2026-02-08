# Kabyar (Kay AI) - Complete Project Documentation & Notes

> AI-Powered Educational Platform | Built with Next.js 16 + TypeScript
> Last Updated: February 8, 2026

---

## 1. Project Overview

**Kabyar** (ကဗျာ) သည် ကျောင်းသားများအတွက် AI-powered learning platform တစ်ခု ဖြစ်ပါတယ်။ GED, IGCSE, OTHM, A-Levels, IB, University students များကို AI tools 25 ခုနဲ့ ကူညီပေးပါတယ်။

### Core Value Proposition
- Essay Writing + AI Detection Bypass
- 25+ AI Tools in one platform
- Multiple AI Models (OpenAI, Claude, Gemini, Grok, Groq)
- Daily credit system (Free/Pro/Unlimited plans)
- Burmese language support (mascot greetings)

---

## 2. Tech Stack (Complete)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.1 |
| Language | TypeScript | 5.7.2 |
| Styling | Tailwind CSS | 3.4.17 |
| UI Components | shadcn/ui (Radix UI) | Latest |
| Animation | Framer Motion | 12.29.0 |
| Database | PostgreSQL (Supabase) | - |
| ORM | Prisma | 6.1.0 |
| Auth | NextAuth v5 | 5.0.0-beta.25 |
| AI - OpenAI | openai | 4.77.0 |
| AI - Claude | @anthropic-ai/sdk | 0.33.1 |
| AI - Gemini | @google/generative-ai | 0.21.0 |
| AI - Grok | Uses OpenAI SDK format | - |
| AI - Groq | groq-sdk | 0.37.0 |
| Vector DB | Pinecone | 6.1.4 |
| State Mgmt | Zustand | 4.5.7 |
| Validation | Zod | 3.24.1 |
| Markdown | react-markdown | 9.0.1 |
| Math Render | KaTeX | 0.16.28 |
| Diagrams | Mermaid | 11.12.2 |
| Charts | Chart.js + react-chartjs-2 | 4.5.1 |
| Presentations | pptxgenjs + reveal.js | 4.0.1 |
| PDF Parsing | pdf-parse + mammoth | - |
| YouTube | youtube-transcript + youtubei.js | - |
| Deployment | Vercel | - |

---

## 3. Project Structure

```
kayai/
├── prisma/
│   ├── schema.prisma          # Database schema (8 models)
│   └── seed.ts                # Database seeding
├── public/
│   ├── kabyar-logo.png        # Main logo
│   └── ads.txt                # Google AdSense
├── src/
│   ├── app/
│   │   ├── (auth)/            # Auth pages (login, register, forgot/reset password)
│   │   ├── (dashboard)/       # Protected dashboard pages
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx           # Main dashboard (news, notes, tools grid)
│   │   │   │   ├── library/           # User's saved documents
│   │   │   │   ├── plans/             # Pricing plans
│   │   │   │   ├── settings/          # User settings & profile
│   │   │   │   ├── rag/               # RAG & Document tools (5 tools)
│   │   │   │   ├── research/          # Research tools (2 tools)
│   │   │   │   ├── media/             # Audio/Video tools (4 tools)
│   │   │   │   ├── visual/            # Visual tools (4 tools)
│   │   │   │   └── writing/           # Writing tools (10 tools)
│   │   │   └── layout.tsx             # SessionProvider + Sidebar
│   │   ├── api/
│   │   │   ├── ai/                    # Core AI routes (chat, detect, essay, humanize, etc.)
│   │   │   ├── auth/                  # NextAuth + custom auth routes
│   │   │   ├── news/                  # AI-generated daily news
│   │   │   ├── tools/                 # 25+ tool API endpoints
│   │   │   ├── user/                  # User profile, credits, activity, documents
│   │   │   └── utils/                 # PDF/Doc parsing utilities
│   │   ├── about/                     # About page
│   │   ├── blog/                      # Blog with dynamic [slug] routes
│   │   ├── contact/                   # Contact page
│   │   ├── tools/                     # Public tool landing pages
│   │   ├── privacy/                   # Privacy policy
│   │   ├── terms/                     # Terms of service
│   │   ├── layout.tsx                 # Root layout (fonts, analytics, adsense)
│   │   ├── page.tsx                   # Landing page (hero, features, testimonials)
│   │   └── globals.css                # Global styles
│   ├── components/
│   │   ├── ads/                       # AdSense & rewarded ads
│   │   ├── ai/                        # File input, language/model selectors
│   │   ├── auth/                      # Onboarding check & dialog
│   │   ├── dashboard/                 # Tools grid component
│   │   ├── layout/                    # Sidebar, provider selector
│   │   ├── premium/                   # Mascot, glass card, animations, etc.
│   │   ├── slides/                    # Presentation slide renderers
│   │   ├── tools/                     # Content input, file uploader, mermaid, tool shell
│   │   └── ui/                        # shadcn/ui components (button, card, dialog, etc.)
│   ├── hooks/
│   │   ├── use-chat-history.ts        # Chat history management
│   │   ├── use-persisted-state.ts     # localStorage state persistence
│   │   ├── use-response-history.ts    # Tool response history
│   │   ├── use-toast.ts              # Toast notifications
│   │   └── use-user-plan.ts          # User plan checking
│   ├── lib/
│   │   ├── ai-providers/
│   │   │   ├── index.ts              # Provider routing, model tiers, streaming
│   │   │   ├── openai.ts             # OpenAI integration
│   │   │   ├── claude.ts             # Anthropic Claude integration
│   │   │   ├── gemini.ts             # Google Gemini integration (+ vision)
│   │   │   ├── grok.ts               # xAI Grok integration (with retry/backoff)
│   │   │   ├── groq.ts               # Groq integration (Kimi K2, compound search)
│   │   │   └── types.ts              # Shared AI types
│   │   ├── auth.ts                    # NextAuth configuration
│   │   ├── blog-data.ts              # Blog content data
│   │   ├── credits.ts                # Credit system logic
│   │   ├── humanizer-utils.ts        # Text humanization utilities
│   │   ├── integrations/
│   │   │   ├── search.ts             # Tavily/Exa search integration
│   │   │   ├── tts.ts                # Text-to-speech
│   │   │   └── youtube.ts            # YouTube transcript/audio extraction
│   │   ├── language-utils.ts          # Multi-language support
│   │   ├── prisma.ts                  # Prisma client singleton
│   │   ├── prompts.ts                 # All AI system prompts
│   │   ├── tools-data.ts             # Landing page tool definitions
│   │   ├── tools-registry.ts          # Dashboard tool registry (25 tools)
│   │   ├── utils.ts                   # General utilities (cn, etc.)
│   │   └── vector/
│   │       ├── index.ts               # Vector operations
│   │       ├── pgvector.ts            # PostgreSQL vector extension
│   │       └── pinecone.ts            # Pinecone vector operations
│   └── types/
│       └── next-auth.d.ts             # NextAuth type extensions
├── middleware.ts                       # Auth middleware (protects /dashboard/*)
├── next.config.ts                     # Next.js config
├── tailwind.config.ts                 # Tailwind config
├── components.json                    # shadcn/ui config
├── vercel.json                        # Vercel deployment config
└── package.json                       # Dependencies
```

---

## 4. Database Schema (Prisma)

### Models (8 total)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **User** | User accounts | email, password, aiProvider, plan (free/pro/unlimited), dailyCredits, profile fields |
| **Account** | OAuth accounts | provider, providerAccountId, tokens |
| **Session** | Auth sessions | sessionToken, expires |
| **Usage** | Credit usage tracking | feature, tokens, model |
| **Conversation** | Chat conversations | title, feature |
| **Message** | Chat messages | role, content |
| **Document** | Uploaded documents | filename, content, vectorId |
| **DocumentChunk** | Document chunks for RAG | content, chunkIndex, pageNumber, vectorId |

### User Profile Fields
- dateOfBirth, school, major, yearOfStudy, occupation
- educationLevel, learningStyle, subjects (JSON)
- preferredLanguage, studyGoal, hobbies

---

## 5. AI Provider System

### Provider Architecture
```
User selects Model Tier → getModelConfig(tier) → { provider, model, apiKey }
                        → stream/chat function → AI Response
                        → Auto-fallback on 403/429
```

### Model Tier Mapping

| Tier | Provider | Model | Credits | Access |
|------|----------|-------|---------|--------|
| super-smart | Gemini | gemini-2.5-pro-preview-05-06 | 0 | Pro/Unlimited only |
| pro-smart | Gemini | gemini-2.5-flash-preview-05-20 | 5 | All users |
| normal | Grok | grok-3-mini | 3 | All users |
| fast | Groq | kimi-k2-instruct | 2 | All users |

### Fallback Chain
- Grok → Gemini (on 403/429)
- Groq → Gemini (on 403/429)
- Grok has retry with exponential backoff (1s, 2s, 4s)

### Key Functions
- `streamWithTier(messages, tier)` - Stream with auto-provider selection
- `chatWithTier(messages, tier)` - Chat with auto-provider selection
- `streamWithTierVision(messages, images, tier)` - Vision (always Gemini)

---

## 6. Credits System

### Daily Credits
| Plan | Daily Credits | Reset |
|------|--------------|-------|
| Free | 50 | Every 24 hours (UTC) |
| Pro | 3,500 | Every 24 hours (UTC) |
| Unlimited | No limit | N/A |

### Credit Calculation
- Base: 3 credits per 1,000 words (minimum 3)
- pro-smart tier: minimum 5 credits
- super-smart tier: 0 credits (free for Pro/Unlimited)

### Flow
1. `checkCredits(userId, tier, words)` → allowed/denied
2. `deductCredits(userId, amount, feature, model)` → deduct before streaming
3. `Usage` model tracks all usage for analytics

---

## 7. Authentication System

### NextAuth v5 Configuration
- **Strategy**: JWT (30-day sessions)
- **Providers**: Google OAuth + Email/Password (bcrypt)
- **Adapter**: PrismaAdapter
- **Protected Routes**: `/dashboard/*` (via middleware.ts)
- **Cookies**: Secure prefix for HTTPS, SameSite=lax

### Auth Flow
1. User registers → password hashed with bcrypt
2. Login → JWT token created with user ID
3. JWT callback enriches token with user data
4. Session callback exposes user ID to client
5. Middleware protects `/dashboard/*` routes

---

## 8. All 25 Tools (Detailed)

### Category 1: RAG & Document Intelligence
| # | Tool | Slug | API Endpoint | Credits |
|---|------|------|-------------|---------|
| 1 | PDF Q&A Sniper | pdf-qa | /api/tools/pdf-qa | 4 |
| 2 | Quiz Generator | quiz-generator | /api/tools/quiz | 3 |
| 3 | Past Paper Analyzer | past-paper | /api/tools/past-paper | 8 |
| 4 | Flashcard Maker | flashcard-maker | /api/tools/flashcard | 3 |
| 5 | Resume/CV Tailor | resume-tailor | /api/tools/resume | 5 |

### Category 2: Research & Search
| # | Tool | Slug | API Endpoint | Credits |
|---|------|------|-------------|---------|
| 6 | Academic Consensus | academic-consensus | /api/tools/consensus | 5 |
| 7 | Research Gap Finder | research-gap | /api/tools/research-gap | 5 |

### Category 3: Audio & Video
| # | Tool | Slug | API Endpoint | Credits |
|---|------|------|-------------|---------|
| 8 | YouTube Summarizer | youtube-summarizer | /api/tools/youtube | 3 |
| 9 | PDF to Podcast | pdf-podcast | /api/tools/podcast | 8 |
| 10 | Lecture Organizer | lecture-organizer | /api/tools/lecture | 5 |
| 11 | Viva Simulator | viva-simulator | /api/tools/viva | 2 |

### Category 4: Visual & Diagrams
| # | Tool | Slug | API Endpoint | Credits |
|---|------|------|-------------|---------|
| 12 | Mind Map Generator | mind-map | /api/tools/mindmap | 3 |
| 13 | Interactive Timeline | timeline | /api/tools/timeline | 3 |
| 14 | Text to Flowchart | flowchart | /api/tools/flowchart | 3 |
| 15 | Lab Report Generator | lab-report | /api/tools/lab-report | 5 |

### Category 5: Writing & Helpers
| # | Tool | Slug | API Endpoint | Credits |
|---|------|------|-------------|---------|
| 16 | Image to Solution | image-solve | /api/tools/image-solve | 5 |
| 17 | Roast My Assignment | roast-assignment | /api/tools/roast | 4 |
| 18 | Safe Paraphraser | paraphraser | /api/tools/paraphrase | 3 |
| 19 | Content Humanizer | humanizer | /api/ai/humanize-diff | 5 |
| 20 | AI Detector | ai-detector | /api/ai/detect | 3 |
| 21 | Code Logic Visualizer | code-visualizer | /api/tools/code-visual | 3 |
| 22 | Explain Error | explain-error | /api/tools/error | 3 |
| 23 | Devil's Advocate | devils-advocate | /api/tools/advocate | 3 |
| 24 | Vocabulary Upgrader | vocabulary-upgrader | /api/tools/vocab | 3 |
| 25 | Cold Email Generator | cold-email | /api/tools/email | 3 |

---

## 9. API Routes Map

### Core AI Routes (`/api/ai/`)
- `POST /api/ai/chat` - General AI chat (tutor, homework, answer finder)
- `POST /api/ai/essay` - Essay generation
- `POST /api/ai/detect` - AI content detection
- `POST /api/ai/humanize` - Content humanization
- `POST /api/ai/humanize-diff` - Humanization with diff highlighting
- `POST /api/ai/presentation` - Presentation generation
- `POST /api/ai/presentation-genui` - Thesys GenUI presentation
- `POST /api/ai/slides` - Slide generation
- `POST /api/ai/slides/export` - Export slides to PPTX
- `POST /api/ai/study-guide` - Study guide generation
- `POST /api/ai/thesys` - Thesys API integration

### Tool Routes (`/api/tools/`)
- Each tool has its own route.ts file
- YouTube has sub-routes: audio, chat, comments, extract-audio, flashcards, mindmap, translate

### User Routes (`/api/user/`)
- `GET /api/user/credits` - Get credit balance
- `POST /api/user/credits/reward` - Ad reward credits
- `GET/POST /api/user/profile` - User profile CRUD
- `GET /api/user/activity` - Recent usage activity
- `GET/POST /api/user/documents` - Document management
- `GET/PUT/DELETE /api/user/documents/[id]` - Single document

### Auth Routes (`/api/auth/`)
- `[...nextauth]` - NextAuth handler
- `POST /api/auth/register` - New user registration
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

---

## 10. Component Architecture

### Premium Components (`src/components/premium/`)
- **KayMascot** - Animated mascot character (happy/thinking/celebrating moods)
- **MascotSpeech** - Speech bubble for mascot
- **GlassCard** - Glassmorphism card with backdrop blur
- **ToolHero** - Hero section for tool pages
- **StepIndicator** - Step progress indicator
- **AnimatedButton** - Buttons with micro-interactions
- **Shimmer** - Loading skeleton shimmer effect
- **ProgressRing** - Circular progress indicator
- **Gamification** - Achievement/streak tracking

### Dashboard Components
- **Sidebar** - Collapsible sidebar with tool categories, favorites, profile popup
- **ToolsGrid** - Searchable/filterable grid of all tools
- **ToolShell** - Shared wrapper for all tool pages

### UI Components (shadcn/ui)
- Button, Card, Dialog, Input, Label, Textarea
- Select, Slider, Tabs, Progress, Toast
- Avatar, Tooltip, Credits Dialog
- MindMap renderer, Mermaid renderer
- Cookie Consent, History Panel

---

## 11. Key Design Patterns

### Streaming Response Pattern
```typescript
// API Route
const stream = await streamWithTier(messages, modelTier);
return new Response(stream, {
  headers: { "Content-Type": "text/plain; charset=utf-8", "Transfer-Encoding": "chunked" }
});

// Client
const reader = response.body?.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = new TextDecoder().decode(value);
  setResult(prev => prev + text);
}
```

### Credit Check + Deduct Pattern
```typescript
const session = await auth();
const userId = session?.user?.id;

const check = await checkCredits(userId, tier, estimatedWords);
if (!check.allowed) {
  return NextResponse.json({ error: check.error }, { status: 402 });
}

await deductCredits(userId, creditsNeeded, "tool-name", tier);
// Then stream response...
```

### Tool Page Pattern
Each tool page follows this structure:
1. State management (input, output, loading, model tier)
2. `handleGenerate()` function
3. Credit check → API call → Stream response
4. Result display with copy/export buttons
5. Response history sidebar

---

## 12. Environment Variables

### Required
```env
DATABASE_URL=postgresql://...          # Supabase PostgreSQL
NEXTAUTH_SECRET=random-secret          # Auth secret
NEXTAUTH_URL=http://localhost:3000     # Base URL
```

### AI Provider Keys
```env
OPENAI_API_KEY=sk-...                  # OpenAI
ANTHROPIC_API_KEY=sk-ant-...           # Claude
GOOGLE_AI_API_KEY=AIza...              # Gemini
GROK_API_KEY=xai-...                   # Grok
GROQ_API_KEY=gsk-...                   # Groq
```

### Optional Services
```env
GOOGLE_CLIENT_ID=...                   # Google OAuth
GOOGLE_CLIENT_SECRET=...               # Google OAuth
PINECONE_API_KEY=...                   # Vector DB
PINECONE_INDEX_NAME=kay-ai-docs        # Vector index
TAVILY_API_KEY=...                     # Web search
EXA_API_KEY=...                        # Academic search
THESYS_API_KEY=...                     # Presentation GenUI
```

---

## 13. Development Commands

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run start         # Start production
npm run lint          # ESLint
npm run db:push       # Push schema to database
npm run db:seed       # Seed database
npm run db:reset      # Reset + reseed database
```

---

## 14. Monetization

### Revenue Streams
1. **Google AdSense** - Ads on landing page + dashboard
2. **Rewarded Ads** - Watch ad to earn credits
3. **Pro Plan** - 3,500 daily credits
4. **Unlimited Plan** - No credit limits
5. **Dashboard Ad Popup** - 3-hour interval for free users

### Google Analytics
- Tracking ID: G-SGJZ5YFVY1
- Consent mode with cookie consent banner

---

## 15. Landing Page Structure

The landing page (`src/app/page.tsx`) has these sections:
1. Floating Header with navigation
2. Hero with animated 3D floating shapes + stats
3. Feature Showcase (8 tools interactive cards)
4. AI Models Section (GPT-4, Claude, Gemini, Grok)
5. How It Works (4 steps)
6. Benefits (Save time, Improve grades, Learn faster, Stay undetected)
7. Programs Supported (GED, IGCSE, OTHM, A-Levels, IB, AP, SAT/ACT, University)
8. Testimonials (6 reviews)
9. Comparison Table (Kabyar vs Others)
10. Final CTA
11. Footer

---

## 16. Important Notes & Gotchas

### API Key in Code
- `GEMINI_SUPER_SMART_KEY` is hardcoded in `ai-providers/index.ts` for the super-smart/pro-smart tiers
- This should be moved to environment variables for security

### Middleware
- Only protects `/dashboard/*` routes
- Uses NextAuth's auth export directly

### Event System
- `credits-updated` - Dispatched after credit changes, sidebar listens
- `profile-updated` - Dispatched after profile changes
- Both trigger sidebar profile re-fetch

### Sidebar Favorites
- Stored in localStorage (`favorite-tools`)
- Right-click on collapsed icons to toggle favorite
- Star icon on expanded tool items

### Daily News
- AI-generated based on user profile
- Cached in localStorage for the day
- Can force refresh

### Sticky Notes
- Dashboard feature, stored in component state
- Not persisted to database (resets on page refresh)

---

## 17. Known Architecture Decisions

1. **JWT over DB sessions** - For better Vercel performance
2. **Credit deduction before streaming** - Prevents abuse but credits lost on errors
3. **Grok as default provider** - Changed from OpenAI to reduce costs
4. **Gemini as fallback** - Most reliable, hardcoded API key
5. **No gradient colors** - Design rule: white + blue only
6. **Burmese mascot** - Target audience is Myanmar students
7. **25 tools in 5 categories** - Organized by function type
8. **Pinecone for vectors** - Used only for RAG tools (PDF Q&A, etc.)
