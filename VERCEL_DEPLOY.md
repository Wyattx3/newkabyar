# Kay AI - Vercel Deploy Guide

## အဆင့်ဆင့် Deploy လုပ်နည်း

### 1. Vercel Login (ပထမဆုံး တစ်ကြိမ်ပဲလုပ်ရမယ်)

Terminal မှာ run ပါ:

```powershell
vercel login
```

ထွက်လာတဲ့ link ကို browser မှာ ဖွင့်ပြီး Vercel account နဲ့ login ဝင်ပါ။

---

### 2. Deploy Script Run ပါ

Login ပြီးသွားရင်:

```powershell
cd c:\Users\Administrator\kayai
.\scripts\vercel-deploy.ps1
```

သို့မဟုတ် manual လုပ်မယ်ဆိုရင်:

```powershell
# Path ထည့်ပါ
$env:Path = "C:\Program Files\nodejs;" + $env:APPDATA + "\npm;" + $env:Path
cd c:\Users\Administrator\kayai

# Link (ပထမဆုံး)
vercel link --yes

# .env ကို Vercel ထဲ push (optional - script က auto လုပ်ပြီးသား)
# သို့မဟုတ် Vercel Dashboard → Settings → Environment Variables မှာ manual ထည့်ပါ

# Deploy
vercel --prod --yes
```

---

### 3. Environment Variables

**Script က `.env` မှာရှိတဲ့ variables တွေကို auto push လုပ်ပေးပါတယ်။**

သို့မဟုတ် Vercel Dashboard မှာ manual ထည့်မယ်ဆိုရင်:

1. https://vercel.com/dashboard
2. Project ကို ရွေးပါ
3. **Settings** → **Environment Variables**
4. `.env.example` မှာပါတဲ့ variables တွေကို ထည့်ပါ

**အရေးကြီးသော Variables:**
- `DATABASE_URL` - Supabase/PostgreSQL connection string
- `NEXTAUTH_SECRET` - `openssl rand -base64 32` နဲ့ generate
- `NEXTAUTH_URL` - Production URL (ဥပမာ `https://kayai.vercel.app`)
- `OPENAI_API_KEY`, `GROK_API_KEY`, `GOOGLE_AI_API_KEY`, etc.

---

### 4. Production NEXTAUTH_URL

Deploy ပြီးပြီဆိုရင် Vercel က URL ပေးပါမယ် (ဥပမာ `https://kayai-xxx.vercel.app`).

ဒီ URL ကို **NEXTAUTH_URL** အနေနဲ့ Vercel Environment Variables မှာ update လုပ်ပါ။

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `vercel` command not found | `$env:Path = "C:\Program Files\nodejs;" + $env:APPDATA + "\npm;" + $env:Path` |
| No credentials | `vercel login` run ပါ |
| Build fails | Database/API keys မှန်ကန်မှု စစ်ပါ |
| Auth not working | NEXTAUTH_URL ကို production URL နဲ့ ပြင်ပါ |

---

## Quick Deploy (One-liner)

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:APPDATA + "\npm;" + $env:Path; cd c:\Users\Administrator\kayai; .\scripts\vercel-deploy.ps1
```
