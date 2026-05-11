# josephs-corner — Product Roadmap

A personal study platform for private tutoring students. Goal: reliable, useful study tool for 10–100 users. Monetization and scaling come after the product is solid.

---

## Current State — Phase 4 Complete

- Public document library with category sidebar and search
- Admin upload/delete dashboard (admin-only auth)
- AI quiz generation from PPTX, DOCX, MD files (10 MCQs via Groq)
- Google Docs Viewer inline preview for PDF, PPTX, DOCX
- Improved quiz prompt (Bloom's taxonomy + misconception-based distractors)
- Admin page redirects to /login instead of showing "Unauthorized"
- Fully deployed on Vercel, cross-device compatible

---

## Phase 4 — Quiz Bank Import ✓ Complete

**Goal:** Admin uploads an existing quiz DOCX → AI parses it into structured questions → students take an interactive quiz on the web.

Shipped:
- New Supabase tables: `quiz_banks` + `quiz_questions` (with RLS, public read)
- `/api/quiz-bank/import/prepare` — extracts DOCX text, splits into 5k-char chunks, creates `quiz_bank` row
- `/api/quiz-bank/import/chunk` — processes one chunk per call via Groq (`llama-3.1-8b-instant`), saves questions
- Client-driven chunking with live progress bar, retry logic (3 attempts + exponential backoff), and auto-resume via localStorage if tab closes mid-import
- `/quiz-banks` — lists all quiz banks with question counts
- `/quiz-banks/[id]` — interactive quiz: one question at a time, answer reveal, final score, restart
- Admin panel extended with quiz bank import form (separate from document upload)
- Supports unlimited questions — no cap, chunks until end of document

---

## Phase 5 — Student Auth

**Goal:** Students create accounts and access gated content.

Planned features:
- Supabase email/password auth for non-admin visitors
- Access code system (manual — no payment integration yet)
- Protected routes for quiz banks and premium documents
- Basic student profile page

---

## Phase 6 — Polish and Reliability

**Goal:** Production-ready for real users.

Planned features:
- Mobile responsiveness fixes (sidebar fixed width, search box layout)
- Accessibility improvements (aria-labels, semantic HTML, screen reader support)
- Groq rate limit UX (cooldown timer or request queue)
- PDF quiz generation (requires additional library or Gemini Files API)
- Error handling improvements across quiz and upload flows

---

## Future — When Ready to Scale

These are not planned for the near term. They become relevant once the product has real users and stable usage.

- Supabase Pro (when approaching free tier limits)
- Vercel Pro (if needing longer function timeouts or more bandwidth)
- Stripe payment integration
- Score tracking and student progress history
- Spaced repetition / flashcard mode
- Platform rebrand and rename

---

## Technical Constraints

| Constraint | Detail |
|---|---|
| Groq free tier | 14,400 RPD, 12,000 TPM — consecutive quiz calls can hit rate limit |
| Vercel Hobby | 10s default timeout, 60s max with `maxDuration` config |
| Supabase free | 500MB DB, 1GB storage — not a concern at current scale |
| PDF quiz | Not supported yet — text extraction requires additional library |
| Processing | Fully server-side on Vercel — cross-device by design |
