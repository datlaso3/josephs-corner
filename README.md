# Joseph's Corner

A public study library — browse, search, and AI-quiz any uploaded document.
Anyone can read. Only the configured admin can upload or delete.

- **Stack:** Next.js 14 (App Router) + TypeScript + Tailwind
- **Storage / Auth / DB:** Supabase
- **Supports:** PDF, DOCX, PPTX, Markdown
- **Deploy:** Vercel
- **AI Quiz:** Groq (llama-3.3-70b-versatile, free tier)

---

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned features and product direction.

---

## Changelog

### Phase 3 — May 2026
- Fixed PPTX/DOCX quiz extraction: switched from blind XML stripping to targeted `<a:t>` / `<w:t>` tag parsing for clean text
- Upgraded quiz model: `llama-3.1-8b-instant` → `llama-3.3-70b-versatile` (better JSON compliance)
- Raised quiz `max_tokens` 3000 → 4000 to prevent truncated responses
- Added Google Docs Viewer iframe for inline PDF, PPTX, DOCX preview (replaces download-only message)
- Admin page now redirects unauthenticated users to `/login` instead of showing "Unauthorized"

### Phase 2 — May 2026
- Added category sidebar with nested Category → Subcategory → Document hierarchy
- Added AI quiz generation engine (10 MCQs per document, stateless)
- Integrated Groq API (free tier, 14,400 RPD)
- Added 3-state loading stepper for quiz generation UX
- Added "Copy as Text" export for quiz results

### Phase 1 — Initial release
- Public document library with search
- Admin upload/delete dashboard
- PDF, DOCX, PPTX, Markdown support
- Supabase storage + auth + RLS
- Vercel deployment

---

## 1. Set up Supabase

1. Go to [supabase.com](https://supabase.com), create a new project.
2. Open **SQL editor** and paste [`supabase/schema.sql`](./supabase/schema.sql). Run it. This creates:
   - the `documents` table with category/subcategory fields
   - row-level-security policies (public read)
   - a `documents` storage bucket (public read)
3. Open **Authentication → Providers** → enable **Email**.
4. Open **Authentication → Users → Add user → Create new user**. Use your admin email. Mark as auto-confirmed.
5. Open **Project Settings → API**. You need:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`

> The service role key bypasses RLS. Never commit it or expose it client-side.

---

## 2. Get a Groq API key

1. Go to [console.groq.com](https://console.groq.com), create an account.
2. Navigate to **API Keys → Create API Key**.
3. Copy the key → `GROQ_API_KEY` in your env file.

Free tier: 14,400 requests/day, 12,000 tokens/minute — enough for normal student use.
For heavier use, add a credit card on Groq (~$0.007 per quiz, pay-as-you-go).

---

## 3. Run locally

```bash
cp .env.example .env.local
# Fill in .env.local:
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
#   SUPABASE_SERVICE_ROLE_KEY=...
#   ADMIN_EMAIL=you@example.com
#   GROQ_API_KEY=...

pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Click **Admin** → sign in → upload a document.

---

## 4. Deploy to Vercel

1. Push to a GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo. Framework auto-detects as **Next.js**.
3. Add all five environment variables in **Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAIL`
   - `GROQ_API_KEY`
4. Deploy. First build ~1 minute.

---

## Project structure

```
src/
  app/
    page.tsx                   # public homepage with category sidebar
    doc/[id]/page.tsx          # document detail (Google Docs Viewer + quiz)
    login/page.tsx             # admin sign-in
    admin/page.tsx             # admin dashboard (upload + list + delete)
    api/
      upload/route.ts          # POST: server upload to Supabase Storage
      delete/route.ts          # POST: delete a document
      quiz/generate/route.ts   # POST: extract text + call Groq → 10 MCQs
    layout.tsx, globals.css
  components/
    CategorySidebar.tsx        # collapsible category/subcategory nav
    StudyLayout.tsx            # sidebar + doc grid wrapper
    QuizPanel.tsx              # quiz UI: generate, answer, copy
    DocCard.tsx                # document card
    UploadForm.tsx             # admin upload form
    AdminDocList.tsx           # admin document list
    MarkdownPreview.tsx        # markdown renderer
    FileIcon.tsx               # file type badge
    SignOutButton.tsx
  lib/
    types.ts                   # shared types + helpers
    supabase/
      client.ts                # browser Supabase client
      server.ts                # server clients + admin checks
      middleware.ts            # session refresh + /admin guard
middleware.ts                  # Next.js middleware entrypoint
supabase/schema.sql            # idempotent DB + storage setup
```

---

## Notes & gotchas

- **Quiz generation** works for PPTX, DOCX, and Markdown. PDF quiz is not supported (text extraction from PDF requires additional libraries).
- **File preview** uses Google Docs Viewer iframe for PDF, PPTX, and DOCX. Requires files to have a public Supabase URL — works out of the box with this setup.
- **Quiz rate limit** on free Groq: 12,000 tokens/minute. Back-to-back quiz generations may hit this limit — wait ~15-20 seconds between requests.
- **File size limit** is 50 MB, enforced client- and server-side. Change `MAX_BYTES` in `UploadForm.tsx` and `api/upload/route.ts` to adjust.
- **Search** is in-memory. Fast for hundreds of docs; for thousands, swap in Postgres full-text search.
- **Categories** are derived from documents — no separate categories table. Set category/subcategory when uploading.
