# Kay AI (Kabyar) - Project Documentation

## Overview

**Kay AI** (ခေါ် Kabyar) သည် AI-powered learning platform ဖြစ်ပြီး GED, IGCSE, OTHM နှင့် အခြား ကျောင်းသားများအတွက် ဖန်တီးထားသည်။

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | **Next.js 16** (App Router) |
| Language | **TypeScript** |
| Styling | **Tailwind CSS** + **shadcn/ui** |
| Database | **PostgreSQL** (Supabase) + **Prisma ORM** |
| Authentication | **NextAuth.js v5** (Credentials + Google OAuth) |
| State Management | **Zustand** |
| AI Providers | OpenAI, Anthropic Claude, Google Gemini, Grok |

---

## Project Structure

```
kayedu-main/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Database seeder
├── public/
│   ├── kabyar-logo.png        # App logo
│   └── ads.txt                # AdSense verification
├── src/
│   ├── app/
│   │   ├── (auth)/            # Auth pages (login, register, reset-password)
│   │   ├── (dashboard)/       # Dashboard pages (protected routes)
│   │   ├── api/               # API routes
│   │   ├── about/             # About page
│   │   ├── blog/              # Blog pages
│   │   ├── contact/           # Contact page
│   │   ├── privacy/           # Privacy policy
│   │   ├── terms/             # Terms of service
│   │   ├── tools/             # Public tools pages
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Landing page
│   ├── components/
│   │   ├── ads/               # Ad components (AdSense, Rewarded ads)
│   │   ├── ai/                # AI-related components (FileInput, ModelSelector)
│   │   ├── auth/              # Auth components (Onboarding)
│   │   ├── layout/            # Layout components (Sidebar)
│   │   ├── slides/            # Presentation components
│   │   └── ui/                # shadcn/ui components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/
│   │   ├── ai-providers/      # AI provider integrations
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── credits.ts         # Credits system logic
│   │   ├── prisma.ts          # Prisma client
│   │   ├── prompts.ts         # AI system prompts
│   │   └── utils.ts           # Utility functions
│   └── types/                 # TypeScript type definitions
├── tailwind.config.ts         # Tailwind configuration
├── next.config.ts             # Next.js configuration
└── package.json               # Dependencies
```

---

## Core Features (8 AI Tools)

### 1. Essay Writer (`/dashboard/essay-writer`)
- Academic essay generation
- Multiple academic levels (High School, IGCSE, GED, Undergraduate)
- Essay types: Argumentative, Expository, Narrative, Persuasive
- Citation styles: APA, MLA, Harvard, Chicago
- **Auto-humanize** feature to bypass AI detection
- File attachment support (images, PDF, text)

### 2. AI Detector (`/dashboard/ai-detector`)
- Detects AI-generated content
- Returns AI/Human score (0-100)
- Identifies specific AI indicators in text
- Provides improvement suggestions

### 3. Humanizer (`/dashboard/humanizer`)
- Transforms AI text to human-like writing
- Multiple tones: Casual, Formal, Academic, Natural
- Intensity levels: Light, Medium, Heavy
- Preserves original meaning

### 4. Answer Finder (`/dashboard/answer-finder`)
- Question answering with explanations
- Step-by-step solutions
- Multi-language support

### 5. Homework Helper (`/dashboard/homework-helper`)
- Assignment guidance
- Problem-solving assistance
- All subjects support

### 6. Study Guide (`/dashboard/study-guide`)
- Comprehensive study material generation
- Custom topics and depth levels
- Optional examples and review questions

### 7. Presentation Maker (`/dashboard/presentation`)
- Slide outline generation
- Speaker notes
- Professional formatting
- Export to PPTX

### 8. AI Tutor (`/dashboard/tutor`)
- Personalized tutoring sessions
- Subject-specific assistance
- Adaptive learning levels

---

## Database Schema (Prisma)

### User Model
```prisma
model User {
  id               String    @id @default(cuid())
  email            String    @unique
  name             String?
  password         String?
  aiProvider       String    @default("openai")
  
  # Credits System
  dailyCredits     Int       @default(50)
  dailyCreditsUsed Int       @default(0)
  creditsResetAt   DateTime  @default(now())
  plan             String    @default("free") // free, pro, unlimited
  
  # Profile
  dateOfBirth      String?
  school           String?
  major            String?
  educationLevel   String?
  learningStyle    String?
  preferredLanguage String?
}
```

### Other Models
- **Account** - OAuth accounts
- **Session** - User sessions
- **Usage** - Feature usage tracking
- **Conversation** - Chat conversations
- **Message** - Chat messages

---

## AI Provider System

### Available Providers
1. **OpenAI** (GPT-4, GPT-4o, GPT-3.5)
2. **Claude** (Claude 3.5 Sonnet, Haiku, Opus)
3. **Gemini** (Gemini 2.0, 1.5 Pro, Flash)
4. **Grok** (Grok 3 Mini, Grok 4 Fast)

### Model Tiers
| Tier | Description | Provider | Credits |
|------|-------------|----------|---------|
| super-smart | Most powerful | Gemini 3 Pro | 0 (Pro only) |
| pro-smart | Fast & intelligent | Gemini 3 Flash | 5 |
| normal | Balanced | Grok 3 Mini | 3 |
| fast | Quick reasoning | Grok 4 Fast | 3 |

---

## Credits System

### Daily Credits
- **Free users**: 50 credits/day
- **Pro users**: 3500 credits/day
- **Unlimited users**: No limit

### Credit Costs
- Base: 3 credits per 1000 words (minimum 3)
- Pro-smart model: 5 credits minimum
- Super-smart: Free for Pro/Unlimited users

### Reset Logic
- Credits reset every 24 hours (UTC-based)
- Automatic reset on first API call after 24 hours

---

## Authentication

### NextAuth v5 Configuration
- **Providers**: Credentials, Google OAuth
- **Session**: JWT strategy (30 days max age)
- **Adapter**: Prisma Adapter

### Protected Routes
- All `/dashboard/*` routes require authentication
- Redirects to `/login` if unauthenticated

---

## API Routes

### AI Routes (`/api/ai/*`)
| Route | Method | Description |
|-------|--------|-------------|
| `/api/ai/chat` | POST | Chat (Answer, Homework, Tutor) |
| `/api/ai/essay` | POST | Essay generation |
| `/api/ai/detect` | POST | AI detection |
| `/api/ai/humanize` | POST | Text humanization |
| `/api/ai/humanize-diff` | POST | Humanize with diff |
| `/api/ai/presentation` | POST | Presentation outline |
| `/api/ai/slides` | POST | Slide content |
| `/api/ai/study-guide` | POST | Study guide generation |

### Auth Routes (`/api/auth/*`)
| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | ALL | NextAuth handlers |
| `/api/auth/register` | POST | User registration |
| `/api/auth/forgot-password` | POST | Password reset request |
| `/api/auth/reset-password` | POST | Password reset |

### User Routes (`/api/user/*`)
| Route | Method | Description |
|-------|--------|-------------|
| `/api/user/profile` | GET/PUT | User profile |
| `/api/user/credits` | GET | Credits info |
| `/api/user/credits/reward` | POST | Ad reward credits |

---

## Multi-Language Support

### Supported Languages
- English (en)
- Myanmar/Burmese (my)
- Chinese (zh)
- Thai (th)
- Korean (ko)
- Japanese (ja)

### Implementation
- Language selector in sidebar
- AI responses adapt to selected language
- Natural, conversational translations (not robotic)

---

## Monetization

### Google AdSense
- Account: `ca-pub-4199720806695409`
- Pre-generation ads for free users
- Dashboard popup ads (3-hour interval)
- Rewarded ads for extra credits

### Plans
1. **Free** - 50 credits/day, ads shown
2. **Pro** - 3500 credits/day, no ads, super-smart access
3. **Unlimited** - No limits

---

## UI/UX Notes

### Design System
- **Colors**: Blue primary (#2563eb), white background
- **Font**: Outfit (sans), JetBrains Mono (mono)
- **Border Radius**: 0.5rem default
- **Shadows**: Subtle, modern shadows

### Key Components
- `Button` - Multiple variants (default, outline, ghost)
- `Card` - Content containers
- `Dialog` - Modal dialogs
- `Select` - Dropdown selections
- `Slider` - Range inputs
- `Toast` - Notifications

### Animations
- fade-in, fade-up, scale-in, slide-in
- Float animation for decorative elements
- Staggered animations for lists

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
AUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# AI API Keys
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_AI_API_KEY="..."
GROK_API_KEY="..."

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Database commands
npm run db:push      # Push schema to database
npm run db:seed      # Seed database
npm run db:reset     # Reset and reseed database
```

---

## Important Notes for Development

### AI Prompts (`src/lib/prompts.ts`)
- All AI system prompts are centralized
- Include accuracy rules to prevent hallucination
- AI detection bypass patterns built into essay prompt

### Credits Logic (`src/lib/credits.ts`)
- Always check credits before API calls
- Deduct credits BEFORE streaming response
- Emit `credits-updated` event for sidebar refresh

### State Persistence
- Use `usePersistedState` hook for form data
- Survives page navigation within session
- Clear on explicit user action

### Error Handling
- 401 = Unauthorized (redirect to login)
- 402 = Insufficient credits (show credits dialog)
- 500 = Server error (show toast)

---

## Deployment (Vercel)

1. Push to GitHub
2. Import in Vercel
3. Configure environment variables
4. Deploy!

### vercel.json Configuration
- Automatic builds on push
- Edge functions for API routes
- Image optimization enabled

---

**Last Updated**: January 2026
**Version**: 0.1.0
