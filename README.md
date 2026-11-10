# PasteWise

Ctrl+V for confusing paperwork, explained in your own language, with voice.

## How to test (30 seconds)

- Live: open the deployed URL on a phone → click "Try an example" → pick a document → switch language → press Listen.
- Demo mode works with no API keys. Local: `npm i && npm run dev`, then `npm run smoke`.
- Demo documents are cached and load instantly; no network required.
- Voice readout: the three demo documents ship pre-rendered readouts in `frontend/public/audio/` (Amharic and English), so Listen works even when the device has no Amharic voice. Regenerate after editing demo copy with `node scripts/generate-demo-audio.mjs am en`. Live documents fall back to the device voice, and the UI says so when no voice for that language exists.

## Problem (2 sentences)

Official documents (benefit notices, medical letters, school fee slips) decide people's access to healthcare, money, and services — but millions can't read them due to literacy, language, or legalese barriers. PasteWise lets anyone paste or snap a document and get a plain-language explanation, checklist, and voice readout in Amharic, Oromo, Tigrinya, or English in ~90 seconds.

## Solution + screenshots

Paste or upload a document → structured explanation in four cards (What this is / What you must do / Deadline & cost / Documents to bring) → verified dates and amounts cross-checked against the source text → voice readout per card → follow-up questions. Every verified deadline and cost keeps the exact source span, so "Show original" highlights the words it came from. An `/eval` page shows baseline vs Adaption-improved output per language with honest failure cases.

Screenshots: `docs/` (Home, Result in Amharic, Result in English, Follow-up, Eval).

Pages: `/` (paste box), `/result`, `/eval`, `/privacy`, `/limitations` — all reachable from the header (desktop and mobile menu) and the footer. Privacy explains what happens to a pasted document; Limitations lists what the app gets wrong.

The header also has a light/dark theme toggle, remembered in `localStorage` and defaulting to your system preference.

## Architecture

Vite + React + TypeScript + Tailwind. Client-side demo mode; API routes (`/api/explain`, `/api/followup`, `/api/tts`, `/api/health`) for live calls. Deterministic verification layer (`/lib/verify.ts`) checks dates/amounts against source text. Zod schema (`/lib/schema.ts`) validates all structured output.

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
- Copy the production backend URL (e.g. `https://pastewise-backend.onrender.com`).

### 2. Frontend (Vercel)
- Import the repo, choose the Vite preset.
- Build command: `cd frontend && npm install && npm run build`
- Output directory: `frontend/dist`
- Set env var `VITE_API_BASE=https://pastewise-backend.onrender.com` (your backend URL).
- Deploy.

### 3. Verify
Open the Vercel URL, click "Try an example", switch language, press Listen. Run `npm run smoke` locally against the production backend by setting `VITE_API_BASE` to it.

## How we use Adaption and why (load-bearing)

The seed corpus in `data/adaption/seeds.json` contains 25 authored Ethiopian notices with English structured explanations. A server-side build script uploads them to Adaption, runs `adapt` with `column_mapping: { chat: "messages" }` plus `translate` in Amharic, Oromo, and Tigrinya, polls the run, downloads the rows, and caches `data/adaption/dataset.json`. At request time the server loads that cache and few-shots the explainer with four translated example patterns per language. The API key stays server-only (`ADAPTION_API_KEY`, never `VITE_`-prefixed).

Rebuild the cache with:

```bash
npx tsx scripts/adaption-dataset.ts
```

This spends Adaption credits and takes several minutes. The committed cache means normal app usage needs no Adaption calls.

## Eval results

`scripts/eval-ab.ts` runs the Groq model on held-out seed documents (excluding the few-shot rows) in Amharic, Oromo, and Tigrinya, both without and with the Adaption-translated few-shot examples. It writes `data/eval/results.json`; `/api/eval` and `/eval` render those measured values and publish failing rows. Rows that never produced an explanation because the provider returned a rate-limit or network error are reported as "not measured" and excluded from accuracy denominators instead of being scored as wrong answers. `npm run eval:recompute` rebuilds the aggregates from saved rows with no API calls. Re-run the full A/B with `npx tsx scripts/eval-ab.ts`. The page shows an explicit "no measured results" state until that file exists.

## What's honestly unfinished / limitations

- Not legal or medical advice; outputs are explanations, always verify with the issuer.
- Low-resource language quality varies; see `/eval` for measured gaps.
- OCR struggles with handwriting and bad lighting; pasted text is the primary path.
- Live LLM calls require an API key; demo mode works offline without one.

## Future work (the cut list)

Accounts, history, push reminders, native app, offline OCR, payments, B2B dashboards, new document types, PWA install, share-as-image.

## Privacy

Documents are not stored. Processed in memory; only metadata (length, language, latency) is logged.

## Built during the hackathon

Created during the CTRL-V Hackathon (Nov 7–11, 2026). No pre-existing code reused.

## Tech stack, license

Vite, React, TypeScript, Tailwind, zod, lucide-react. MIT License.
# PasteWise
