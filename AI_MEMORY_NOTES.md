# Kay AI (Kabyar) - AI Memory Notes

ဒီ file ကို AI Agent မေ့သွားရင် reference လုပ်ဖို့ဖန်တီးထားတာပါ။

---

## Quick Reference Card

### Project Info
- **Name**: Kay AI (Kabyar) - AI-Powered Educational Platform
- **Framework**: Next.js 16 (App Router) + TypeScript
- **Database**: PostgreSQL (Supabase) + Prisma ORM
- **Auth**: NextAuth.js v5-beta
- **Styling**: Tailwind CSS + shadcn/ui
- **AI Providers**: Gemini, Grok, Groq, OpenAI, Claude

---

## Project Structure Map

```
newkabyar/
│
├── .cursor/rules/                    # Cursor AI Rules
│   ├── kabyar-complete-memory.mdc   # Complete project memory
│   └── kayedu-project.mdc           # Original project rules
│
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── seed.ts                       # Database seeder
│
├── src/
│   ├── app/                          # Next.js App Router
│   │   │
│   │   ├── (auth)/                   # Auth Pages (Public)
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   │
│   │   ├── (dashboard)/              # Dashboard (Protected)
│   │   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   │   └── dashboard/
│   │   │       ├── page.tsx          # Dashboard home
│   │   │       ├── settings/         # User settings
│   │   │       ├── plans/            # Subscription plans
│   │   │       ├── library/          # User's saved content
│   │   │       │
│   │   │       ├── rag/              # RAG & Document Tools
│   │   │       │   ├── pdf-qa/
│   │   │       │   ├── quiz-generator/
│   │   │       │   ├── past-paper/
│   │   │       │   ├── flashcard-maker/
│   │   │       │   └── resume-tailor/
│   │   │       │
│   │   │       ├── research/         # Research Tools
│   │   │       │   ├── academic-consensus/
│   │   │       │   └── research-gap/
│   │   │       │
│   │   │       ├── media/            # Audio/Video Tools
│   │   │       │   ├── youtube-summarizer/
│   │   │       │   ├── pdf-podcast/
│   │   │       │   ├── lecture-organizer/
│   │   │       │   └── viva-simulator/
│   │   │       │
│   │   │       ├── visual/           # Visual Tools
│   │   │       │   ├── mind-map/
│   │   │       │   ├── timeline/
│   │   │       │   ├── flowchart/
│   │   │       │   └── lab-report/
│   │   │       │
│   │   │       └── writing/          # Writing Tools
│   │   │           ├── image-solve/
│   │   │           ├── roast-assignment/
│   │   │           ├── paraphraser/
│   │   │           ├── humanizer/
│   │   │           ├── ai-detector/
│   │   │           ├── code-visualizer/
│   │   │           ├── explain-error/
│   │   │           ├── devils-advocate/
│   │   │           ├── vocabulary-upgrader/
│   │   │           └── cold-email/
│   │   │
│   │   ├── api/                      # API Routes
│   │   │   ├── ai/                   # Core AI endpoints
│   │   │   │   ├── chat/route.ts
│   │   │   │   ├── essay/route.ts
│   │   │   │   ├── detect/route.ts
│   │   │   │   ├── humanize/route.ts
│   │   │   │   ├── humanize-diff/route.ts
│   │   │   │   ├── presentation/route.ts
│   │   │   │   └── study-guide/route.ts
│   │   │   │
│   │   │   ├── tools/                # Tool-specific APIs
│   │   │   │   ├── pdf-qa/route.ts
│   │   │   │   ├── quiz/route.ts
│   │   │   │   ├── flashcard/route.ts
│   │   │   │   ├── past-paper/route.ts
│   │   │   │   ├── resume/route.ts
│   │   │   │   ├── consensus/route.ts
│   │   │   │   ├── research-gap/route.ts
│   │   │   │   ├── youtube/route.ts
│   │   │   │   ├── podcast/route.ts
│   │   │   │   ├── lecture/route.ts
│   │   │   │   ├── viva/route.ts
│   │   │   │   ├── mindmap/route.ts
│   │   │   │   ├── timeline/route.ts
│   │   │   │   ├── flowchart/route.ts
│   │   │   │   ├── lab-report/route.ts
│   │   │   │   ├── image-solve/route.ts
│   │   │   │   ├── roast/route.ts
│   │   │   │   ├── paraphrase/route.ts
│   │   │   │   ├── code-visual/route.ts
│   │   │   │   ├── error/route.ts
│   │   │   │   ├── advocate/route.ts
│   │   │   │   ├── vocab/route.ts
│   │   │   │   └── email/route.ts
│   │   │   │
│   │   │   ├── auth/                 # Auth APIs
│   │   │   │   ├── [...nextauth]/route.ts
│   │   │   │   ├── register/route.ts
│   │   │   │   ├── forgot-password/route.ts
│   │   │   │   └── reset-password/route.ts
│   │   │   │
│   │   │   └── user/                 # User APIs
│   │   │       ├── profile/route.ts
│   │   │       ├── credits/route.ts
│   │   │       └── documents/route.ts
│   │   │
│   │   ├── blog/                     # Blog pages
│   │   ├── tools/                    # Public tool landing pages
│   │   ├── about/
│   │   ├── contact/
│   │   ├── privacy/
│   │   ├── terms/
│   │   └── page.tsx                  # Landing page
│   │
│   ├── components/
│   │   ├── ads/                      # Ad components
│   │   │   ├── adsense-ad.tsx
│   │   │   ├── rewarded-ad.tsx
│   │   │   └── pre-generation-ad.tsx
│   │   │
│   │   ├── ai/                       # AI components
│   │   │   ├── file-input.tsx
│   │   │   ├── model-selector.tsx
│   │   │   └── language-selector.tsx
│   │   │
│   │   ├── auth/                     # Auth components
│   │   │   ├── onboarding-check.tsx
│   │   │   └── onboarding-dialog.tsx
│   │   │
│   │   ├── dashboard/                # Dashboard components
│   │   │   └── tools-grid.tsx
│   │   │
│   │   ├── layout/                   # Layout components
│   │   │   ├── sidebar.tsx
│   │   │   └── provider-selector.tsx
│   │   │
│   │   ├── premium/                  # Premium UI components
│   │   │   ├── glass-card.tsx
│   │   │   ├── animated-button.tsx
│   │   │   ├── loading-states.tsx
│   │   │   ├── step-indicator.tsx
│   │   │   └── tool-hero.tsx
│   │   │
│   │   ├── slides/                   # Presentation components
│   │   │   ├── ProfessionalSlides.tsx
│   │   │   └── SlideRenderer.tsx
│   │   │
│   │   ├── tools/                    # Shared tool components
│   │   │   ├── content-input.tsx
│   │   │   ├── file-uploader.tsx
│   │   │   ├── mermaid-renderer.tsx
│   │   │   └── tool-shell.tsx
│   │   │
│   │   └── ui/                       # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       ├── toast.tsx
│   │       └── ...
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── use-chat-history.ts
│   │   ├── use-persisted-state.ts
│   │   ├── use-response-history.ts
│   │   ├── use-toast.ts
│   │   └── use-user-plan.ts
│   │
│   ├── lib/                          # Core libraries
│   │   ├── ai-providers/             # AI provider integrations
│   │   │   ├── index.ts              # Main exports, tier config
│   │   │   ├── openai.ts
│   │   │   ├── claude.ts
│   │   │   ├── gemini.ts
│   │   │   ├── grok.ts
│   │   │   ├── groq.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── integrations/             # Third-party integrations
│   │   │   ├── search.ts
│   │   │   ├── tts.ts
│   │   │   └── youtube.ts
│   │   │
│   │   ├── vector/                   # Vector DB
│   │   │   ├── pinecone.ts
│   │   │   └── pgvector.ts
│   │   │
│   │   ├── auth.ts                   # NextAuth configuration
│   │   ├── credits.ts                # Credits system logic
│   │   ├── prisma.ts                 # Prisma client
│   │   ├── prompts.ts                # AI system prompts
│   │   ├── tools-registry.ts         # 25 tools metadata
│   │   ├── tools-data.ts             # Tool landing page data
│   │   ├── blog-data.ts              # Blog content
│   │   ├── humanizer-utils.ts        # Humanizer utilities
│   │   ├── language-utils.ts         # Language utilities
│   │   └── utils.ts                  # General utilities
│   │
│   └── types/
│       └── next-auth.d.ts            # NextAuth type extensions
│
├── public/                           # Static files
│   ├── kabyar-logo.png
│   └── ads.txt
│
├── test/                             # Test data
│
├── .env.example                      # Environment template
├── middleware.ts                     # Auth middleware
├── next.config.ts                    # Next.js config
├── package.json                      # Dependencies
├── tailwind.config.ts                # Tailwind config
└── vercel.json                       # Vercel deployment
```

---

## AI Model Configuration

### Model Tiers (src/lib/ai-providers/index.ts)

```typescript
export const MODEL_TIERS = {
  "super-smart": { 
    name: "Super Smart", 
    provider: "gemini", 
    model: "gemini-2.5-pro-preview-05-06", 
    credits: 0, 
    proOnly: true 
  },
  "pro-smart": { 
    name: "Pro Smart", 
    provider: "gemini", 
    model: "gemini-2.5-flash-preview-05-20", 
    credits: 5 
  },
  "normal": { 
    name: "Normal", 
    provider: "grok",
    grokModel: "grok-3-mini",
    credits: 3 
  },
  "fast": { 
    name: "Fast", 
    provider: "groq", 
    model: "kimi-k2", 
    credits: 2 
  },
};
```

### Fallback Logic
- If Grok/Groq returns 403 or 429, automatically fallback to Gemini
- Uses `gemini-2.0-flash` as fallback model

---

## Credits System (src/lib/credits.ts)

### Credit Calculation
```typescript
// Base: 3 credits per 1000 words (min 3)
const wordCredits = Math.max(3, Math.ceil(wordCount / 1000) * 3);

// Pro-smart: minimum 5 credits
// Super-smart: 0 credits (Pro only)
```

### Daily Reset Logic
- Credits reset every 24 hours (UTC-based)
- Free users: 50 credits/day
- Pro users: 3500 credits/day
- Unlimited: No limit

### Credit Check Flow
```typescript
// 1. Check if user has enough credits
const check = await checkCredits(userId, model, wordCount);
if (!check.allowed) {
  return Response.json({ error: check.error }, { status: 402 });
}

// 2. Deduct BEFORE streaming (important!)
await deductCredits(userId, check.creditsNeeded, "tool-name", model);

// 3. Stream the AI response
const stream = await streamWithTier(model, systemPrompt, userMessage);
```

### Credit Update Event
```typescript
// Dispatch after credit changes for sidebar refresh
window.dispatchEvent(new Event("credits-updated"));
```

---

## Authentication (src/lib/auth.ts)

### NextAuth v5 Configuration
- **Providers**: Credentials, Google OAuth
- **Session Strategy**: JWT (30 days)
- **Adapter**: Prisma Adapter

### Session Structure
```typescript
session.user = {
  id: string,
  email: string,
  name: string,
  image: string
}
```

### Protected Routes
- All `/dashboard/*` routes require auth
- Middleware in `middleware.ts` handles protection
- Redirects to `/login` if unauthenticated

---

## Database Schema (prisma/schema.prisma)

### User Model
```prisma
model User {
  id               String    @id @default(cuid())
  email            String    @unique
  emailVerified    DateTime?
  name             String?
  password         String?
  image            String?
  aiProvider       String    @default("openai")
  resetToken       String?
  resetTokenExpiry DateTime?
  
  // Credits
  dailyCredits     Int       @default(50)
  dailyCreditsUsed Int       @default(0)
  creditsResetAt   DateTime  @default(now())
  plan             String    @default("free") // free, pro, unlimited
  
  // Profile
  dateOfBirth      String?
  school           String?
  major            String?
  yearOfStudy      String?
  occupation       String?
  educationLevel   String?
  learningStyle    String?
  subjects         String?   @db.Text
  preferredLanguage String?
  studyGoal        String?   @db.Text
  hobbies          String?   @db.Text
  
  // Relations
  usageHistory     Usage[]
  sessions         Session[]
  accounts         Account[]
  conversations    Conversation[]
  documents        Document[]
}
```

### Document Model (for RAG)
```prisma
model Document {
  id          String   @id @default(cuid())
  userId      String
  filename    String
  contentType String
  size        Int
  vectorId    String?
  content     String?  @db.Text
  metadata    Json?
  toolId      String?
  chunks      DocumentChunk[]
}

model DocumentChunk {
  id         String   @id @default(cuid())
  documentId String
  chunkIndex Int
  content    String   @db.Text
  pageNumber Int?
  metadata   Json?
  vectorId   String?
}
```

---

## Design Guidelines

### Color Palette
| Color | Hex | Tailwind |
|-------|-----|----------|
| Primary | #2563eb | blue-600 |
| Primary Hover | #1d4ed8 | blue-700 |
| Background | #ffffff | white |
| Text Primary | #111827 | gray-900 |
| Text Secondary | #4b5563 | gray-600 |
| Text Muted | #9ca3af | gray-400 |
| Border | #f3f4f6 | gray-100 |

### Critical Design Rules
1. **NO GRADIENTS** - Use solid colors only (white + blue)
2. **NO AI-like generic UI** - Premium custom design
3. **NO colored backgrounds behind icons** - Plain icons
4. Use `rounded-xl` or `rounded-2xl` for borders
5. Subtle shadows (`shadow-sm`, `shadow-lg`)

### Component Examples

```tsx
// Premium Card
<div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow">
  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
    <h3 className="font-medium text-gray-900 text-sm">Card Title</h3>
  </div>
  <div className="p-4">
    {/* Content */}
  </div>
</div>

// Primary Button
<Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20">
  Generate <ArrowRight className="ml-2 h-4 w-4" />
</Button>

// Secondary Button
<Button variant="outline" className="border-gray-200 hover:bg-gray-50 rounded-xl">
  Cancel
</Button>

// Input
<Input className="rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20" />
```

---

## Tool Implementation Guide

### Adding a New Tool

1. **Add to tools-registry.ts**:
```typescript
{
  id: 'new-tool',
  slug: 'new-tool',
  name: 'New Tool Name',
  description: 'Full description...',
  shortDescription: 'Short description',
  category: 'writing', // rag, research, media, visual, writing
  icon: 'IconName', // Lucide icon name
  color: 'rose',
  apiEndpoint: '/api/tools/new-tool',
  credits: 3,
  features: ['Feature 1', 'Feature 2'],
  requiresUpload: false,
  requiresVision: false,
  status: 'active',
}
```

2. **Create page**: `src/app/(dashboard)/dashboard/[category]/new-tool/page.tsx`

3. **Create API**: `src/app/api/tools/new-tool/route.ts`

4. Tool automatically appears in sidebar and tool grid!

---

## Useful Hooks

### usePersistedState
```typescript
// Persists across page navigation
const [value, setValue, clearValue] = usePersistedState("key", defaultValue);
```

### useChatHistory
```typescript
const { messages, addMessage, clearHistory, isLoading } = useChatHistory("feature-name");
```

### useResponseHistory
```typescript
const { responses, addResponse, clearResponses } = useResponseHistory("tool-name");
```

### useUserPlan
```typescript
const { plan, credits, isLoading, refreshCredits } = useUserPlan();
```

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# NextAuth
AUTH_SECRET="your-32-char-secret"
NEXTAUTH_URL="http://localhost:3000"

# AI Providers
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_AI_API_KEY="AIzaSy..."
GROK_API_KEY="xai-..."
GROQ_API_KEY="gsk_..."

# Google OAuth (optional)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Credits not updating in sidebar | Dispatch `window.dispatchEvent(new Event("credits-updated"))` |
| AI detection score too high | Use basic vocabulary, avoid banned phrases in prompts.ts |
| Authentication issues | Check AUTH_SECRET, database connection |
| Grok API blocked (403/429) | Automatic fallback to Gemini is built-in |
| Streaming not working | Check Content-Type header, use streamWithTier |
| User not found in API | Verify session.user.id exists |

---

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database commands
npm run db:push      # Push schema changes
npm run db:seed      # Seed database
npm run db:reset     # Reset and reseed

# Linting
npm run lint
```

---

## Multi-Language Support

Supported languages:
- `en` - English
- `my` - Myanmar/Burmese
- `zh` - Chinese (Simplified)
- `th` - Thai
- `ko` - Korean
- `ja` - Japanese

Language selector in sidebar, AI responses adapt to selected language.

---

## Contact & Repository

- **Repository**: https://github.com/Wyattx3/newkabyar.git
- **Last Updated**: February 2026
- **Version**: 0.1.0

---

## Quick Commands for AI Agent

When you need to work on this project, remember:

1. **Check credits.ts** for credit logic
2. **Check ai-providers/index.ts** for AI configuration
3. **Check tools-registry.ts** for tool metadata
4. **Check prompts.ts** for AI system prompts
5. **Use streamWithTier** for streaming AI responses
6. **Dispatch credits-updated event** after credit changes
7. **NO GRADIENTS** - Only solid colors
8. **Use rounded-xl** for all borders
