# AccessBridge

**One question. Any language. Every opportunity.**

Upload or paste a document — a scholarship announcement, a government service notice, a school fee
letter — and get it back in plain language, in your own language, with every date and amount
verified against the original.

Amharic · Afaan Oromoo · Tigrinya · English — and more.

---

## The problem

Official documents decide people's access to healthcare, money, education and services — but
millions cannot read them because of language, literacy, or legalese barriers. A student cannot
understand a scholarship announcement; a rural citizen cannot act on a service notice.

AccessBridge turns any document into a plain-language answer, a step-by-step checklist, and a
voice readout — in about 90 seconds.

---

## What it does now

| Area | What you can do |
|------|-----------------|
| **Input** | Paste text, upload PDF/TXT/image, take a photo, or import a web page by URL |
| **Explain** | Structured explanation: what this is / what you must do / who can apply and how / deadline & cost / documents to bring |
| **Plain language** | Simplify mode: Simple / Standard / Detailed — same facts, three ways of writing them |
| **Voice** | Text-to-speech readout with speed control and voice language selection |
| **Translate** | Side-by-side translation with the original kept visible |
| **Actions** | Tick-off checklist with progress tracking |
| **Library** | Saved documents, search across text, one-tap delete (browser-only) |
| **History** | Conversation history with full thread |
| **Compare** | Two documents side by side |
| **Accessibility** | Light/dark theme, large text, reduced motion, keyboard and screen-reader support |
| **Trust** | Every date and amount cross-checked against the source; unverified values shown as "check the original" |

---

## How to test (30 seconds)

### Option 1: Local development (recommended)

```bash
# Install dependencies
npm install

# Start both frontend and API server
npm run dev
```

This starts:
- **Vite dev server**: `http://localhost:5174/` (or next available port)
- **Express API**: `http://localhost:3001`

Open `http://localhost:5174/` in your browser, paste a document, pick a language, press **Explain it**.

### Option 2: Demo mode (fully offline, no API key)

The bundled demo documents load instantly with no network and no API key:

1. Paste any text, or click **Try an example**
2. Pick a language (Amharic, Oromo, Tigrinya, English)
3. Press **Explain it**
4. Press **Listen** for voice readout
5. Ask a follow-up question

Run the smoke test to verify everything works:
```bash
npm run smoke
```

---

## Demo script (3 minutes)

1. **(0–15s)** The problem over a real notice: *"This is a notice millions of people can't read."*
   Then show the working product immediately — paste → result visible.
2. **(15–60s)** Paste the notice → Amharic explanation → checklist → **Listen** voice readout.
   Switch the plain-language level to **Simple** and show the same facts in shorter sentences.
3. **(60–100s)** Open the **Opportunity Access** page: describe yourself, press *Check my
   eligibility*, and show each requirement with the quote it came from.
4. **(100–130s)** Open **Settings**, turn on **Large text** and **Light theme**. Then open
   **Actions** and tick off the checklist.
5. **(130–165s)** Open the **Evaluation** page: baseline vs Adaption-improved output per language,
   with failing rows listed honestly.
6. **(165–180s)** Close on the impact: *"Anyone can access what they need, just by pasting."*

---

## Screens

| Path | Screen |
|------|--------|
| `/` | Paste box — paste text, upload file, take photo, or try an example |
| `/result` | Structured explanation in four cards + sticky bottom bar (Listen · language · Ask) |
| `/upload` | 6-step wizard: Upload → Explain → Verify → Listen → Ask → Evaluate |
| `/eval` | Evaluation dashboard: baseline vs Adaption, per language, with failure cases |
| `/privacy` | What happens to your document |
| `/limitations` | Honest limitations — what works well, what doesn't |
| `/dashboard` | Workspace hub — access to all tools |
| `/assistant` | Chat with your document |
| `/library` | Saved documents |
| `/reader` | Read a saved document in another language |
| `/translate` | Side-by-side translation |
| `/simplify` | Re-explain at Simple / Standard / Detailed level |
| `/voice` | Voice readout with speed control |
| `/actions` | Checklist progress |
| `/opportunity` | Eligibility check against published requirements |
| `/compare` | Two documents side by side |
| `/history` | Conversation history |
| `/settings` | Accessibility and account preferences |

---

## Architecture

**Frontend:** Vite + React + TypeScript + Tailwind CSS  
**Backend:** Express (serverless on Vercel)  
**Verification:** Deterministic code checks every date and amount against the source text

### Client-side demo mode

Works fully offline with no API key:
- 3 bundled demo documents in 4 languages (English, Amharic, Oromo, Tigrinya)
- Pre-computed explanations, voice readouts, and verification results
- Zero network required

### Live mode (with API keys)

When API keys are configured, live calls go to:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/explain` | POST | Generate structured explanation from text/file |
| `/api/extract` | POST | Extract text from uploaded file (OCR) |
| `/api/verify` | POST | Verify deadlines and costs against source text |
| `/api/ask` / `/api/followup` | POST | Answer follow-up questions from document context |
| `/api/tts` | POST | Text-to-speech (falls back to browser voice) |
| `/api/health` | GET | Health check |
| `/api/eval` | GET | Evaluation metrics (baseline vs Adaption) |
| `/api/auth/*` | POST/GET | Account registration, login, session |

**Core invariant:** The LLM proposes; deterministic code verifies. No date, amount, or deadline
is shown as verified unless its evidence can be traced to the original source text.

---

## Deploy to Vercel

The project is pre-linked to a Vercel project (`pastewise`). The Express server bundles into a
single serverless function at `api/index.js`.

### 1. Link to Vercel (if not already linked)

```bash
vercel login
vercel link
```

### 2. Deploy

```bash
vercel --prod
```

Build settings are in `vercel.json`:
- Build command: `cd frontend && npm install && npm run build`
- Output directory: `frontend/dist`
- API routes rewrite `/api/*` to the serverless function

### 3. Environment variables

Set these in the Vercel project dashboard (server-side only):

| Variable | Needed for |
|----------|------------|
| `ANTHROPIC_API_KEY` | Live explanations, follow-ups, translation |
| `GEMINI_API_KEY` | OCR for photos and PDFs |
| `ADAPTION_API_KEY` | Adaption dataset, few-shot examples, evaluation |
| `TTS_PROVIDER_KEY` | Hosted text-to-speech (optional; browser voice otherwise) |
| `TTS_PROVIDER` + `TTS_BASE_URL` | Keyless server TTS via local OpenAI-compatible endpoint |
| `AUTH_STORE_PATH` | Persistent location for account/session JSON file |
| `COOKIE_SAMESITE` | Set `none` when frontend and API are on different sites |
| `DAILY_SPEND_CAP_USD` | Hard cap on live model spend |

### 4. Run standalone

The server also runs standalone on port 3001:

```bash
npm run server:dev
```

The Vite dev server proxies `/api` to it automatically.

---

## How we use Adaption (load-bearing sponsor integration)

Adaption's Invent-a-Dataset / Adaptive Data builds a plain-language simplification corpus for
Amharic, Oromo, and Tigrinya. This is load-bearing: it directly improves the low-resource
language outputs that are central to our impact evaluation.

- Seed corpus → dataset build → few-shot examples → improved multilingual simplification
- Evaluation page publishes baseline vs Adaption-improved results per language
- Failing rows are published honestly, not just wins
- OCR and speech are independent providers (not Adaption)

---

## Evaluation

`/eval` shows measured before/after results:

- Field accuracy by language (English, Amharic, Oromo, Tigrinya)
- Side-by-side sample outputs
- Published failure cases with planned fixes
- Metrics are real, not synthetic; misses are published alongside wins

---

## What's honestly unfinished / limitations

- **Not legal or medical advice.** Outputs are explanations, always verify with the issuer.
- **Retrieval uses local feature-hashed embeddings, not a neural embedding model.** Deliberate:
  keeps the no-key/no-network demo guarantee and handles Amharic/Oromo script variation reasonably,
  but a hosted embedding model would likely rank paraphrases better.
- **Keyless TTS requires a local OpenAI-compatible endpoint.** If none is running, audio falls back
  to the device voice and the UI says so.
- **Accounts live in a JSON file.** On Vercel's ephemeral filesystem they won't survive a redeploy
  or work consistently across instances; `AUTH_STORE_PATH` must point at persistent storage, or
  the store needs a database adapter.
- **Low-resource language quality varies.** See `/eval` for measured gaps.
- **OCR struggles with handwriting and bad lighting.** Pasted text is the primary path.
- **Live LLM calls require an API key.** Demo mode works offline without one.
- **Voice input** uses the browser Web Speech API — only available in browsers that support it;
  text input always works.
- **The eligibility check** is an assessment against published requirements, never a prediction of
  acceptance.
- **URL import** fetches a page once server-side; pages behind login, paywall, or JavaScript
  rendering come back mostly empty.

---

## Future work (cut list)

Cross-device library sync, push reminders, native app, offline OCR, payments, B2B dashboards,
new document types, PWA install, share-as-image, measured quality numbers for additional
languages, public accessibility API.

---

## Privacy

Documents are **not stored on the server**. They are processed in memory; only metadata (length,
language, latency) is logged. An account is optional; when you create one, the server stores a
name, a scrypt password hash and session records — never document text. The personal library,
checklist progress, and translation history live in your own browser, and one tap in Settings
deletes all of it.

---

## Built during the hackathon

Created during the **CTRL-V Hackathon** (Nov 7–11, 2026). Internal submit target: Nov 10, ~20:00 EAT.
No pre-existing code reused.

---

## Tech stack & license

Vite, React, TypeScript, Tailwind CSS, zod, lucide-react, Express (serverless on Vercel).
MIT License.
```
