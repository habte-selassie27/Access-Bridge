# AccessBridge

**One question. Any language. Every opportunity.**

Upload a document — a scholarship announcement, a government service notice, a school fee
letter — and get it back in plain language, in your own language, with every date and amount
verified against the original.

## How to test (30 seconds)

- **Live:** open the deployed URL on a phone → **Upload** → pick a file or paste text → step
  through Upload → Explain → Verify → Listen → Ask → Evaluate.
- **Offline:** `npm i && npm run dev`, then `npm run smoke`. The bundled examples and their
  voice readouts need no network and no API key.
- **Voice:** the bundled documents ship pre-rendered readouts in `frontend/public/audio/`
  (Amharic and English), so Listen works even when the device has no Amharic voice. Regenerate
  after editing demo copy with `node scripts/generate-demo-audio.mjs am en`. Live documents fall
  back to the device voice, and the UI says so when no voice for that language exists.

## Problem (2 sentences)

Official documents decide people's access to healthcare, money, education and services — but
millions cannot read them because of language, literacy, or legalese barriers. A student cannot
understand a scholarship announcement; a rural citizen cannot act on a service notice. AccessBridge
turns any of these into a plain-language answer, a step-by-step checklist, and a voice readout in
Amharic, Oromo, Tigrinya or English, in about 90 seconds.

## Solution + screenshots

Upload or paste a document → a structured explanation (**What this is / What you must do / Who can
apply and how / Deadline & cost / Documents to bring**) → every date and amount cross-checked
against the source text → voice readout → follow-up questions answered **only** from the document.

Two things make this different from a summarizer:

1. **The model proposes, deterministic code disposes.** Dates and amounts are verified by
   re-finding them in the source string (`/lib/verify.ts`). A value that cannot be traced back is
   never shown as verified — it is shown as "check the original", with the source span highlighted.
2. **The eval page publishes misses.** `/eval` shows baseline vs Adaption-improved output per
   language with the failing rows listed, not just the wins.

Screenshots: `docs/` (Home, Result in Amharic, Result in English, Follow-up, Eval).

Pages: `/` (paste box + upload CTA), `/upload` (6-step wizard), `/result`, `/eval`, `/privacy`,
`/limitations`.

## Architecture

Vite + React + TypeScript + Tailwind. Client-side demo mode; API routes (`/api/explain`,
`/api/extract`, `/api/verify`, `/api/ask`, `/api/followup`, `/api/tts`, `/api/health`) for live
calls. Deterministic verification layer (`/lib/verify.ts`) checks dates/amounts against source
text. Zod schema (`/lib/schema.ts`) validates all structured output. Explicit state machines
(`/lib/state/`) model every async flow, so states are exhaustive and impossible combinations are
unrepresentable.

## Deploy — Option A (split)

Frontend on Vercel, backend (Express) on any Node host (Render / Railway / Fly.io).

### 1. Backend (Node host)
- Connect your GitHub repo.
- Build/start command: `npm run server:dev` (runs `tsx server/index.ts`).
- Set these env vars:
  - `GROQ_API_KEY` (or `ANTHROPIC_API_KEY` / `GEMINI_API_KEY`)
  - `ADAPTION_API_KEY`
  - `DAILY_SPEND_CAP_USD=5`
  - `PORT=3001`
- Copy the production backend URL (e.g. `https://accessbridge-backend.onrender.com`).

### 2. Frontend (Vercel)
- Import the repo, choose the Vite preset.
- Build command: `cd frontend && npm install && npm run build`
- Output directory: `frontend/dist`
- Set env var `VITE_API_BASE=https://accessbridge-backend.onrender.com` (your backend URL).
- Deploy.

### 3. Verify
Open the Vercel URL, click **Upload**, pick a document, switch language, press Listen. Run
`npm run smoke` locally against the production backend by setting `VITE_API_BASE` to it.

## How we use Adaption and why (load-bearing)

The seed corpus in `data/adaption/seeds.json` contains 25 authored Ethiopian notices with English
structured explanations (including eligibility and how-to-apply). A server-side build script
uploads them to Adaption, runs `adapt` with `column_mapping: { chat: "messages" }` plus
`translate` in Amharic, Oromo, and Tigrinya, polls the run, downloads the rows, and caches
`data/adaption/dataset.json`. At request time the server loads that cache and few-shots the
explainer with translated example patterns per language, so the model writes in the target
language *and* in the right JSON shape. The API key stays server-only (`ADAPTION_API_KEY`, never
`VITE_`-prefixed).

Rebuild the cache with:

```bash
npx tsx scripts/adaption-dataset.ts
```

This spends Adaption credits and takes several minutes. The committed cache means normal app
usage needs no Adaption calls.

## Eval results

`scripts/eval-ab.ts` runs the Groq model on held-out seed documents (excluding the few-shot rows)
in Amharic, Oromo, and Tigrinya, both without and with the Adaption-translated few-shot examples.
It writes `data/eval/results.json`; `/api/eval` and `/eval` render those measured values and
publish failing rows. Rows that never produced an explanation because the provider returned a
rate-limit or network error are reported as "not measured" and excluded from accuracy denominators
instead of being scored as wrong answers. `npm run eval:recompute` rebuilds the aggregates from
saved rows with no API calls. Re-run the full A/B with `npx tsx scripts/eval-ab.ts`. The page
shows an explicit "no measured results" state until that file exists.

## What's honestly unfinished / limitations

- Not legal or medical advice; outputs are explanations, always verify with the issuer.
- Low-resource language quality varies; see `/eval` for measured gaps.
- OCR struggles with handwriting and bad lighting; pasted text is the primary path.
- Live LLM calls require an API key; demo mode works offline without one.
- Voice *input* uses the browser Web Speech API, so it is only available in browsers that support
  it; text input always works.

## Future work (the cut list)

Accounts, history, push reminders, native app, offline OCR, payments, B2B dashboards, new document
types, PWA install, share-as-image.

## Privacy

Documents are not stored. Processed in memory; only metadata (length, language, latency) is logged.

## Built during the hackathon

Created during the CTRL-V Hackathon (Nov 7–11, 2026). No pre-existing code reused.

## Tech stack, license

Vite, React, TypeScript, Tailwind, zod, lucide-react. MIT License.
