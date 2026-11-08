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

## How we use Adaption and why (load-bearing)

Adaption's Invent-a-Dataset / Adaptive Data builds a plain-language simplification set for Amharic, Oromo, and Tigrinya. We show measured before/after quality on `/eval` (field accuracy, plain-language score, faithfulness). The integration is load-bearing: it directly improves the low-resource language outputs that are central to our impact.

## Eval results

See `/eval` in the deployed app. Includes baseline vs Adaption-improved metrics per language, side-by-side samples, and a published "Failure cases" section with real misses and planned fixes.

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
