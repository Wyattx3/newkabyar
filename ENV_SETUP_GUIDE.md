# Environment Variables Setup Guide

## Quick Start

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your API keys and configuration values

3. Generate `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```
   Or using Node.js:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

---

## Required Variables

### 1. Database (`DATABASE_URL`)
**Required** - PostgreSQL connection string

**Option A: Supabase (Recommended)**
1. Go to https://supabase.com/
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string
5. Format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`

**Option B: Local PostgreSQL**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/kabyar_db"
```

---

### 2. NextAuth (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`)
**Required** - Authentication

**Generate Secret:**
```bash
openssl rand -base64 32
```

**Set URL:**
- Development: `http://localhost:3000`
- Production: `https://yourdomain.com`

---

### 3. AI Provider API Keys

#### OpenAI (`OPENAI_API_KEY`)
**Required** - For GPT models

1. Go to https://platform.openai.com/api-keys
2. Create new API key
3. Copy and paste

#### Anthropic Claude (`ANTHROPIC_API_KEY`)
**Required** - For Claude models

1. Go to https://console.anthropic.com/
2. Create API key
3. Format: `sk-ant-...`

#### Google Gemini (`GOOGLE_AI_API_KEY`)
**Required** - For Gemini models (Super Smart & Pro Smart tiers)

1. Go to https://aistudio.google.com/app/apikey
2. Create API key
3. Format: `AIza...`

#### xAI Grok (`GROK_API_KEY`)
**Required** - For Grok models (Normal & Fast tiers)

1. Go to https://console.x.ai/
2. Create API key
3. Format: `xai-...`

---

## Optional Variables

### Google OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
**Optional** - For Google sign-in

1. Go to https://console.cloud.google.com/
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

---

### Vector Database (`PINECONE_API_KEY`, `PINECONE_INDEX_NAME`)
**Optional** - For RAG features (PDF Q&A, etc.)

1. Go to https://www.pinecone.io/
2. Create account and get API key
3. Create index named `kay-ai-docs`

---

### Search APIs

#### Tavily (`TAVILY_API_KEY`)
**Optional** - For web search in research tools

1. Go to https://tavily.com/
2. Sign up and get API key

#### Exa (`EXA_API_KEY`)
**Optional** - For academic search

1. Go to https://exa.ai/
2. Sign up and get API key

---

### Other Services

#### Thesys (`THESYS_API_KEY`)
**Optional** - For presentation generation

1. Get from Thesys service provider

---

## Minimum Setup for Development

For basic development, you only need:

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-..."
GROK_API_KEY="xai-..."
GOOGLE_AI_API_KEY="AIza..."
```

---

## Production Setup

For production deployment (Vercel):

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add all required variables
3. Make sure `NEXTAUTH_URL` is set to your production domain
4. Use strong, random `NEXTAUTH_SECRET`

---

## Security Notes

⚠️ **Never commit `.env` file to Git!**
- `.env` is already in `.gitignore`
- Only commit `.env.example` (without real values)

⚠️ **Keep API keys secure:**
- Don't share API keys publicly
- Rotate keys if exposed
- Use different keys for dev/prod

---

## Testing Your Setup

After setting up `.env`, test the connection:

```bash
# Test database connection
npm run db:push

# Test development server
npm run dev
```

If everything is configured correctly, the app should start without errors.

---

## Troubleshooting

### "API key not configured" error
- Check that the API key is set correctly
- Remove any extra spaces or quotes
- Verify the key is active and has credits

### Database connection error
- Verify `DATABASE_URL` format is correct
- Check database is accessible
- Ensure PostgreSQL is running (if local)

### Authentication not working
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain
- Clear browser cookies and try again

---

**Last Updated**: January 2026
