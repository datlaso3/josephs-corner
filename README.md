# Joseph's Corner

A small, public-read library for study documents. Anyone can browse and search.
Only the configured admin can sign in to upload or delete.

- **Stack:** Next.js 14 (App Router) + TypeScript + Tailwind
- **Storage / Auth / DB:** Supabase
- **Supports:** PDF, DOCX, PPTX, Markdown
- **Deploy:** Vercel

---

## 1. Set up Supabase

1. Go to [supabase.com](https://supabase.com), create a new project. Pick a strong DB password and the region closest to you.
2. Once the project is ready, open **SQL editor** and paste the contents of [`supabase/schema.sql`](./supabase/schema.sql). Run it. This creates:
   - the `documents` table,
   - row-level-security policies (public read),
   - a `documents` storage bucket (public read).
3. Open **Authentication → Providers** and make sure **Email** is enabled. Optionally turn off "Confirm email" while you set things up so your first login works without an inbox round-trip (you can re-enable it later).
4. Open **Authentication → Users → Add user → Create new user**. Use the email you want to administer the site with, and set a password. Mark the user as auto-confirmed.
5. Open **Project Settings → API**. You'll need three values:
   - `Project URL` → goes into `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → goes into `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key → goes into `SUPABASE_SERVICE_ROLE_KEY`

> The service role key bypasses RLS. Never put it in a client component or commit it.

## 2. Run locally

```bash
cp .env.example .env.local
# Edit .env.local with your real values:
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
#   SUPABASE_SERVICE_ROLE_KEY=...
#   ADMIN_EMAIL=you@example.com   <-- the email of the user you created in step 1.4

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click **Admin** in the header, sign in, upload your first document.

### How auth works

The app treats a single email address as the admin. Whoever signs in with that email (set in `ADMIN_EMAIL`) can access `/admin` and call the upload / delete API routes. No other email — even an authenticated Supabase user — gets through. To change admins, change the env var and redeploy.

## 3. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo. Framework should auto-detect as **Next.js**.
3. Add the four environment variables in **Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAIL`
4. Deploy. The first build will take ~1 minute.

Repeat the env vars for **Preview** and **Development** if you want them to work in preview branches.

## Project structure

```
src/
  app/
    page.tsx                   # public homepage (search + cards)
    doc/[id]/page.tsx          # document detail (preview + download)
    login/page.tsx             # admin sign-in
    admin/page.tsx             # admin dashboard (upload + list + delete)
    api/
      upload/route.ts          # POST: server upload to Supabase Storage
      delete/route.ts          # POST: delete a document
    layout.tsx, globals.css
  components/                  # DocCard, BrowseControls, UploadForm, etc.
  lib/
    types.ts                   # shared types + helpers
    supabase/
      client.ts                # browser Supabase client
      server.ts                # server clients + admin checks
      middleware.ts            # session refresh + /admin guard
middleware.ts                  # Next.js middleware entrypoint
supabase/schema.sql            # idempotent DB + storage setup
```

## Notes & gotchas

- **File size limit** is 50 MB, enforced both client- and server-side. To raise it, change `MAX_BYTES` in `src/components/UploadForm.tsx` and `src/app/api/upload/route.ts`. Also check Supabase storage limits for your plan.
- **Search** is currently in-memory (filters the list of all docs). It's fast at hundreds of docs; for thousands, swap in Postgres full-text search via a `search_vector tsvector` column and an `ilike` / `to_tsquery` query in `fetchDocs`.
- **PDF preview** uses the browser's native PDF viewer via `<object>`. Mobile Safari doesn't support inline PDFs — users on those devices will see the download button.
- **DOCX / PPTX preview** is intentionally download-only. Inline previews require third-party services (Office 365 viewer, Google Docs viewer) that need a public URL and have their own caveats; download is the cleanest baseline.
- **Markdown preview** fetches the raw `.md` from Supabase Storage at request time and renders it server-side with `react-markdown` + GFM.
