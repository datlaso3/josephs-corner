# josephs-corner — Bug & Improvement Tracker

## Bugs

### B1 — True/False questions get fake options [FIXED]
**Symptom:** T/F questions show "Maybe" and "Unknown" as options C/D.
**Fix:** PARSE_PROMPT updated — T/F gets A=True B=False C="" D="". Render skips empty strings.
**Status:** FIXED (Deploy: Fix T/F filler options)

### B2 — Import yields fewer questions than expected [MEDIUM]
**Symptom:** 36 chunks processed but only 64 questions — chunks straddling question boundaries yield 0 or partial.
**Root cause:** DOCX text was one giant line before paragraph fix; chunk splits cut questions in half.
**Fix:** DOCX extractor now preserves `\n` between paragraphs (Deploy 3). Re-import existing banks to get clean data.
**Status:** Root cause fixed. Existing DB data still has old bad imports — needs re-import.

### B3 — No back/home button on quiz page [FIXED]
**Status:** FIXED (back link added to quiz page + QuizTaker done screen)

### B4 — Questions render with no answer options [HIGH]
**Symptom:** Question card shows text but zero option buttons — Check button present but nothing to select.
**Seen:** Chapter 1-4_MCQ, Q2/20 in random mode (josephs-corner-ektocqsx2 deployment, May 14 2026)
**Root cause:** Options A/B/C/D all empty strings in DB — question was a fragment split mid-chunk before DOCX paragraph fix. QuizTaker skips empty options (`if (!text) return null`) leaving nothing rendered.
**Fix short-term:** Add a fallback "No options available — skip" UI so student isn't stuck on a blank question.
**Fix long-term:** Re-import affected quiz banks now that DOCX extractor preserves paragraph boundaries.
**Status:** TODO

## Improvements

### I1 — Quiz progress persists on refresh [FIXED]
**Status:** FIXED (Deploy 1 — localStorage progress save per question, resume banner)

### I2 — Chapter filter / jump-to-chapter [LOW]
Quiz banks with multiple chapters could let students filter by chapter before starting.

### I3 — Quiz bank delete button for admin [MEDIUM]
No way to delete a quiz bank from the UI. Admin needs Supabase dashboard to remove bad imports.

### I4 — Keyboard navigation in quiz [LOW]
A/B/C/D keys to select option, Enter to Check/Next. No keydown handlers currently.

### I5 — Auth on /api/quiz/analyze [MEDIUM]
Public endpoint calls paid Groq API. Anyone with the URL can burn credits.
Add session check before calling Groq.

### I6 — Import cancel/pause button [LOW]
No way to stop an in-progress import except closing the tab.
Add a Cancel button that stops the chunk loop and saves partial progress.

### I7 — Retry delay array has dead entry [LOW]
`RETRY_DELAYS = [5000, 15000, 30000]` but MAX_RETRIES=3 means only index 0 and 1 are ever used.
Either bump MAX_RETRIES to 4 or remove the 30000 entry.
