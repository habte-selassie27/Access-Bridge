# AccessBridge

**One question. Any language. Every opportunity.**

Upload a document — a scholarship announcement, a government service notice, a school fee
letter — and get it back in plain language, in your own language, with every date and amount
verified against the original.

## How to test (30 seconds)

- **Live:** open the deployed URL on a phone → **Upload** → pick a file, paste text, or paste a
  web-page link → step through Upload → Explain → Verify → Listen → Ask → Evaluate.
- **The workspace:** **Dashboard** (top left) opens the full app — Assistant, Documents,
  Translate, Simplify, Voice, Actions, Opportunity, Compare and Settings. Everything a document
  touches is saved on the device, so you can move between the tools and keep the same document.
- **Offline:** `npm i && npm run dev`, then `npm run smoke`. The bundled examples and their
  voice readouts need no network and no API key.
- **Voice:** the bundled documents ship pre-rendered readouts in `frontend/public/audio/`
  (Amharic and English), so Listen works even when the device has no Amharic voice. Regenerate
  after editing demo copy with `node scripts/generate-demo-audio.mjs am en`. Live documents fall
  back to the device voice, and the UI says so when no voice for that language exists.

## What it does now

| Area | What you can do |
|---|---|
| **Input** | Paste text, upload PDF/TXT/image, take a photo, or **import a web page by URL**. |
| **Explain** | Structured explanation (what this is / what you must do / who can apply and how / deadline & cost / documents to bring) plus **section extraction**. |
| **Plain language** | **Simplify Mode**: Simple / Standard / Detailed. Same facts, three ways of writing them. Every date and amount is re-verified against the original at each level. |
| **Opportunity** | **Eligibility check**: describe yourself, get each published requirement marked met / not met / unknown, each with a quote from the document. |
| **Voice** | Text-to-speech readout with speed control, transcript, voice language, and voice input in the Assistant. |
| **Translate** | Side-by-side translation with the original kept visible, and a translation history. |
| **Actions** | Checklist with progress you can tick off and keep, deadlines, costs, and a downloadable checklist. |
| **Library** | Saved documents, categories, search across their text, conversation history, one-tap delete. Stored in the browser only. |
| **Compare** | Two documents side by side: what changed, what is only in one, what differs in both. |
| **Accessibility** | Text size, high contrast, light/dark theme, relaxed spacing, simple interface mode, keyboard and screen-reader support, RTL for Arabic. |
| **Trust** | Evidence highlighting, uncertainty detection, "not in this document" answers, and no unsupported dates or amounts — ever. |

## Problem (2 sentences)

Official documents decide people's access to healthcare, money, education and services — but
millions cannot read them because of language, literacy, or legalese barriers. A student cannot
understand a scholarship announcement; a rural citizen cannot act on a service notice. AccessBridge
turns any of these into a plain-language answer, a step-by-step checklist, and a voice readout in
Amharic, Oromo, Tigrinya, Swahili, Arabic, French or English, in about 90 seconds.

## Solution + screenshots

Upload, paste or link a document → a structured explanation (**What this is / What you must do /
Who can apply and how / Deadline & cost / Documents to bring**) → every date and amount
cross-checked against the source text → voice readout → follow-up questions answered **only**
from the document.

Three things make this different from a summarizer:

1. **The model proposes, deterministic code disposes.** Dates and amounts are verified by
   re-finding them in the source string (`/lib/verify.ts`). A value that cannot be traced back is
   never shown as verified — it is shown as "check the original", with the source span highlighted.
   The same rule applies to the eligibility check: a quote the server cannot find in the document
   is downgraded to "not enough information" instead of being shown as a fact.
2. **The eval page publishes misses.** `/eval` shows baseline vs Adaption-improved output per
   language with the failing rows listed, not just the wins.
3. **The app is accessible too.** Text size, contrast, theme, spacing and simple mode are
   first-class settings, because a platform claiming to remove access barriers has to meet its
   own standard.

Screenshots: `docs/` (Home, Result in Amharic, Result in English, Follow-up, Eval).

Pages: `/` (paste box + upload CTA), `/upload` (6-step wizard), `/result`, `/eval`, `/privacy`,
`/limitations`, plus the workspace: `/dashboard`, `/assistant`, `/library`, `/reader`,
`/translate`, `/simplify`, `/voice`, `/actions`, `/opportunity`, `/compare`, `/settings`.

## Architecture

Vite + React + TypeScript + Tailwind. Client-side demo mode; API routes (`/api/explain`,
`/api/extract`, `/api/verify`, `/api/ask`, `/api/followup`, `/api/import`, `/api/eligibility`,
`/api/compare`, `/api/translate`, `/api/simplify`, `/api/tts`, `/api/health`) for live calls.
Deterministic verification layer (`/lib/verify.ts`) checks dates/amounts against source text, and
(`/server/lib/verify/quote-verifier.ts`) checks that every quote the model cites can be found in
the document before it is shown. Zod schema (`/lib/schema.ts`) validates all structured output.
Explicit state machines (`/lib/state/`) model every async flow, so states are exhaustive and
impossible combinations are unrepresentable. The personal library (`/lib/library.ts`) and the
accessibility preferences (`/lib/a11y.ts`) live in the browser only — no account, no server-side
history.

## Demo script (3 minutes)

1. **(0–15s)** The problem over a real notice: "This is a notice millions of people can't read."
   Then show the working product immediately.
2. **(15–60s)** Paste the notice → Amharic explanation, checklist, voice readout. Switch the
   plain-language level to **Simple** and show the same facts in shorter sentences.
3. **(60–100s)** Open the **Opportunity Access** page: describe yourself, press *Check my
   eligibility*, and show each requirement with the quote it came from.
4. **(100–130s)** Open **Settings**, turn on **Large text** and **Light theme**. Then open
   **Actions** and tick off the checklist — the progress bar moves.
5. **(130–165s)** Open the **Evaluation** page: baseline vs Adaption-improved Amharic/Oromo/
   Tigrinya, with the failing rows listed, and the note that other languages are unmeasured.
6. **(165–180s)** Close on the impact: "Anyone can access what they need, just by pasting."

## Deploy

The whole app runs on Vercel: the Vite build is the static site, and the Express server is
bundled into a single serverless function at `api/index.js`.

### 1. Prepare the function
The frontend and the server share code (schema, prompts, verification), and a Vercel function
cannot import from outside `api/`. `scripts/build-serverless.ts` inlines that shared code into
one deployable file. Run it after any change under `server/` or the shared `frontend/src/lib/`
files, or let `npm run build` do it for you:

```bash
npm run build   # frontend build + server typecheck + serverless bundle
```

### 2. Deploy to Vercel
```bash
vercel --prod
```
Or import the repo in the Vercel dashboard with the Vite preset. Settings are in `vercel.json`:
build command `cd frontend && npm install && npm run build`, output directory `frontend/dist`,
and a rewrite that sends `/api/*` to the function and every other path to `index.html` so deep
links work.

### 3. Environment variables
Set these in the Vercel project (they stay server-side; the client only ever sees `VITE_` vars):

| Variable | Needed for |
|---|---|
| `GROQ_API_KEY` (or `ANTHROPIC_API_KEY` / `GEMINI_API_KEY`) | explanations, follow-ups, translation |
| `GEMINI_API_KEY` | OCR for photos and PDFs |
| `ADAPTION_API_KEY` | the Adaption-translated few-shot dataset |
| `DAILY_SPEND_CAP_USD` | hard cap on live model spend |

### 4. Run it anywhere else
The server also runs standalone: `npm run server:dev` starts it on port 3001, and the Vite dev
server proxies `/api` to it.

### Option B (split hosts)
If you would rather host the API on another Node host (Render / Railway / Fly.io), deploy the
server there with `npm run server:dev` and point the frontend at it with
`VITE_API_BASE=https://your-backend-host`.

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
- **Swahili, Arabic and French are supported but not yet measured.** Only Amharic, Oromo and
  Tigrinya have published numbers on the evaluation page, and the language picker marks the
  others as experimental. The saved demo examples only exist in the four measured languages, and
  the app says so rather than showing English text under an Amharic or Arabic label.
- OCR struggles with handwriting and bad lighting; pasted text is the primary path.
- Live LLM calls require an API key; demo mode works offline without one.
- Voice *input* uses the browser Web Speech API, so it is only available in browsers that support
  it; text input always works.
- The eligibility check is an assessment against the published requirements, never a prediction
  of acceptance, and it refuses to answer when the quote it needs cannot be found in the document.
- URL import fetches a page once, on the server, and keeps only the text. Pages behind a login,
  behind a paywall, or rendered entirely in JavaScript will come back mostly empty.
- The personal library is browser-local: it does not follow you to another device, and clearing
  site data deletes it.

## Future work (the cut list)

Accounts and cross-device sync, push reminders, native app, offline OCR, payments, B2B dashboards,
new document types, PWA install, share-as-image, measured quality numbers for Swahili, Arabic and
French, and a public accessibility API.

## Privacy

Documents are not stored on the server. They are processed in memory; only metadata (length,
language, latency) is logged. The personal library, your checklist progress and your translation
history live in your own browser — there is no account, and one tap in Settings deletes all of
it. The URL importer fetches a public page on the server and keeps only the text; it refuses
private, local and cloud-metadata addresses.

## Built during the hackathon

Created during the CTRL-V Hackathon (Nov 7–11, 2026). No pre-existing code reused.

## Tech stack, license

Vite, React, TypeScript, Tailwind, zod, lucide-react, Express (serverless on Vercel). MIT License.
