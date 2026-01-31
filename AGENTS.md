# Kay AI (Kabyar) - Agent Guidelines

## Quick Reference

### Project Type
AI-powered educational platform for students (GED, IGCSE, OTHM)

### Tech Stack
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Prisma + PostgreSQL (Supabase)
- NextAuth v5
- AI: OpenAI, Claude, Gemini, Grok

---

## Feature Map

| Feature | Route | API | Key Files |
|---------|-------|-----|-----------|
| Essay Writer | `/dashboard/essay-writer` | `/api/ai/essay` | `prompts.ts` |
| AI Detector | `/dashboard/ai-detector` | `/api/ai/detect` | `prompts.ts` |
| Humanizer | `/dashboard/humanizer` | `/api/ai/humanize` | `humanizer-utils.ts` |
| Answer Finder | `/dashboard/answer-finder` | `/api/ai/chat` | `prompts.ts` |
| Homework Helper | `/dashboard/homework-helper` | `/api/ai/chat` | `prompts.ts` |
| Study Guide | `/dashboard/study-guide` | `/api/ai/study-guide` | `prompts.ts` |
| Presentation | `/dashboard/presentation` | `/api/ai/presentation` | `prompts.ts` |
| AI Tutor | `/dashboard/tutor` | `/api/ai/chat` | `prompts.ts` |

---

## Common Tasks

### Adding a New AI Feature
1. Create page in `src/app/(dashboard)/dashboard/[feature]/page.tsx`
2. Add API route in `src/app/api/ai/[feature]/route.ts`
3. Add prompt in `src/lib/prompts.ts`
4. Add to sidebar navigation in `src/components/layout/sidebar.tsx`

### Modifying AI Behavior
1. Edit system prompts in `src/lib/prompts.ts`
2. Model selection in `src/lib/ai-providers/index.ts`
3. Credit costs in `src/lib/credits.ts`

### Database Changes
1. Modify `prisma/schema.prisma`
2. Run `npm run db:push`
3. Update related TypeScript types

---

## Key Patterns

### Streaming AI Response
```ts
const stream = await streamWithTier(messages, modelTier);
return new Response(stream, {
  headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Transfer-Encoding": "chunked",
  },
});
```

### Credit Check Flow
```ts
// 1. Check credits
const check = await checkCredits(userId, tier, words);
if (!check.allowed) return { error: check.error, status: 402 };

// 2. Deduct BEFORE streaming
await deductCredits(userId, amount, feature, model);

// 3. Stream response
const stream = await streamWithTier(messages, tier);
```

### Component State Persistence
```ts
// Persists across page navigation
const [value, setValue, clearValue] = usePersistedState("key", defaultValue);
```

---

## Style Guidelines

### Colors
- Primary: Blue (`#2563eb`, `bg-blue-600`)
- Background: White (`#ffffff`)
- Text: Gray scale (`text-gray-900`, `text-gray-600`, `text-gray-400`)
- NO gradients - solid colors only

### Component Styling
```tsx
// Card pattern
<div className="bg-white rounded-xl border border-gray-100 shadow-sm">
  {/* Header */}
  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
    <span className="font-medium text-gray-900 text-sm">Title</span>
  </div>
  {/* Content */}
  <div className="p-4">
    {content}
  </div>
</div>
```

### Button Pattern
```tsx
<Button className="bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20">
  Generate <ArrowRight className="ml-2 h-4 w-4" />
</Button>
```

---

## Environment Setup

```bash
# Required env vars
DATABASE_URL=postgresql://...
AUTH_SECRET=random-secret
NEXTAUTH_URL=http://localhost:3000
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
GROK_API_KEY=...
```

---

## Common Issues

### Credits Not Updating
- Check `credits-updated` event is dispatched
- Verify sidebar listens to the event
- Check UTC time for reset logic

### AI Detection Score Too High
- Review prompts in `prompts.ts`
- Ensure humanizer uses basic vocabulary
- Check banned phrases list

### Authentication Issues
- Verify `AUTH_SECRET` is set
- Check database connection
- Review session strategy in `auth.ts`

---

## Localization

Supported languages in AI responses:
- `en` - English
- `my` - Myanmar/Burmese
- `zh` - Chinese (Simplified)
- `th` - Thai
- `ko` - Korean
- `ja` - Japanese

Language is selected in sidebar and passed to API routes.
