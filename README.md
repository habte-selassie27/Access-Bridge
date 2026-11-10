# Access-Bridge

**Ctrl+V for confusing paperwork.** Paste or snap any official document — a government notice, medical form, school fee letter, or financial document — and get a plain-language explanation, a step-by-step checklist, and a voice readout in your own language.

**Amharic · Afaan Oromoo · Tigrinya · English — and more.**

**Live:** https://access-bridge-brown.vercel.app/

---

## How to test (30 seconds)

**Live site (recommended):** https://access-bridge-brown.vercel.app/
1. Paste a document, or click **Try an example** to load a bundled demo.
2. Pick a language (Amharic, Oromo, Tigrinya, English).
3. Press **Explain it**.
4. Press **Listen** for the voice readout.
5. Ask a follow-up question.

Demo mode works fully offline with no API key.

**Local development:**
```bash
# Install dependencies
npm install

# Start frontend + API server
npm run dev

# Open http://localhost:5174/
```

Then press **Explain it** on any document. Run `npm run smoke` to verify everything works.

---

## The problem

Official documents decide people's access to healthcare, money, education, and services — but millions cannot read them because of language, literacy, or legalese barriers. A student cannot understand a scholarship announcement; a rural citizen cannot act on a service notice. Access-Bridge turns any document into a plain-language answer, a checklist of what to do, and a voice readout — in about 90 seconds, on a phone, with no account required.

---

## What it does

| Feature | What you get |
|---|---|
| **Input** | Paste text, upload PDF/TXT/image, take a photo, or import a web page |
| **Explain** | Structured output: what this is / what you must do / who can apply & how / deadline & cost / documents to bring |
| **Plain language** | Simple / Standard / Detailed — same facts, three ways of writing them |
| **Voice** | Text-to-speech readout with language selection; browser fallback when no server voice exists |
| **Translate** | Side-by-side translation with the original kept visible |
| **Actions** | Tick-off checklist with progress tracking |
| **Library** | Saved documents, search across text (browser-only) |
| **Follow-up** | Ask questions about your document; answers stay grounded in the source |
| **Compare** | Two documents side by side |
| **Accessibility** | Light/dark theme, large text, reduced motion, keyboard and screen-reader support |
| **Trust** | Every date and amount cross-checked against the source; unverified values shown as "check the original" |

---

## How it works

**The LLM proposes; deterministic code verifies.**

1. **Input** — text, photo, or PDF is received and validated.
2. **OCR/vision** — images and scanned PDFs are converted to text (provenance preserved).
3. **Language detection** — source language is identified; user picks the explanation language.
4. **Extraction** — the model proposes summary, actions, deadlines, costs, documents, contacts, glossary, and examples.
5. **Verification** — deterministic code re-finds every date and amount in the original source text. Nothing is marked "verified" unless its evidence is traceable to the source.
6. **Translation** — the explanation is rewritten in the selected language (Amharic, Oromo, Tigrinya, English).
7. **Voice** — TTS reads the explanation aloud; browser speech synthesis is the fallback.

**Core invariant:** No date, amount, or deadline is shown as verified unless its evidence can be traced to the original source text. OCR output is never treated as ground truth.

---

## Architecture

```
USER
  |
  v
NEXT.JS / EXPRESS (single serverless deployment on Vercel)
  |
  +-- API: /api/explain, /api/extract, /api/verify, /api/ask, /api/tts, /api/health, /api/eval
  |
  v
APPLICATION SERVICES (explain, follow-up, translation, speech, pipeline)
  |
  +-- VERIFICATION ENGINE (dates, amounts, evidence, Ethiopian calendar, Ge'ez numerals)
  |
  v
PROVIDER ADAPTERS (LLM, OCR, translation, TTS — provider-independent interfaces)
  |
  +-- ADAPTION (Invent-a-Dataset / Adaptive Data for multilingual simplification)
```

**Frontend:** Vite + React + TypeScript + Tailwind CSS  
**Backend:** Express (serverless on Vercel)  
**Live:** https://access-bridge-brown.vercel.app/

### Demo mode

Works fully offline with no API key:
- 3 bundled demo documents in 4 languages (English, Amharic, Oromo, Tigrinya)
- Pre-computed explanations, voice readouts, and verification results
- Zero network required

### Live mode (with API keys configured)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/explain` | POST | Generate structured explanation from text/file |
| `/api/extract` | POST | Extract text from uploaded file (OCR) |
| `/api/verify` | POST | Verify deadlines and costs against source text |
| `/api/ask` / `/api/followup` | POST | Answer follow-up questions from document context |
| `/api/tts` | POST | Text-to-speech (falls back to browser voice) |
| `/api/health` | GET | Health check |
| `/api/eval` | GET | Evaluation metrics (baseline vs Adaption) |

---

## How we use Adaption (load-bearing sponsor integration)

Adaption's **Invent-a-Dataset / Adaptive Data** builds a plain-language simplification corpus for Amharic, Oromo, and Tigrinya. This is load-bearing — it directly improves the low-resource language outputs that are central to our impact evaluation.

- Seed corpus → dataset build → few-shot examples → improved multilingual simplification
- Evaluation page (`/eval`) publishes baseline vs Adaption-improved results per language
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

- **Not legal or medical advice.** Outputs are explanations; always verify with the issuer.
- **Retrieval uses local feature-hashed embeddings,** not a neural embedding model. Deliberate: keeps the no-key/no-network demo guarantee, but a hosted embedding model would rank paraphrases better.
- **Keyless TTS** requires a local OpenAI-compatible endpoint. If none is running, audio falls back to the device voice and the UI says so.
- **Accounts live in a JSON file.** On Vercel's ephemeral filesystem they won't survive a redeploy; `AUTH_STORE_PATH` must point at persistent storage, or the store needs a database adapter.
- **Low-resource language quality varies.** See `/eval` for measured gaps.
- **OCR struggles with handwriting and bad lighting.** Pasted text is the primary path.
- **Live LLM calls require an API key.** Demo mode works offline without one.
- **Voice input** uses the browser Web Speech API; text input always works.
- **The eligibility check** is an assessment against published requirements, never a prediction of acceptance.
- **URL import** fetches a page once server-side; pages behind login, paywall, or JavaScript rendering come back mostly empty.

---

## Future work (cut list)

Cross-device library sync, push reminders, native app, offline OCR, payments, B2B dashboards, new document types, PWA install, share-as-image, measured quality numbers for additional languages, public accessibility API.

---

## Privacy

Documents are **not stored on the server**. They are processed in memory; only metadata (length, language, latency) is logged. An account is optional; when you create one, the server stores a name, a password hash, and session records — never document text. The personal library, checklist progress, and translation history live in your own browser, and one tap in Settings deletes all of it.

---

## Deploy to Vercel

The project is pre-linked to a Vercel project (`access-bridge-brown`). The Express server bundles into a single serverless function.

### 1. Import to Vercel
Push this repo to GitHub, then import it in Vercel. Set the framework preset to **Vite** and the root directory to `frontend`.

### 2. Build settings
- **Build command:** `npm install && npm run build`
- **Install command:** `npm install`
- **Output directory:** `dist`
- **Root directory:** `frontend`

### 3. Environment variables
Set these in the Vercel project dashboard (server-side only):

| Variable | Needed for |
|---|---|
| `ANTHROPIC_API_KEY` | Live explanations, follow-ups, translation |
| `GEMINI_API_KEY` | OCR for photos/PDFs |
| `ADAPTION_API_KEY` | Adaption dataset, few-shot examples, evaluation |
| `TTS_PROVIDER_KEY` | Hosted text-to-speech (optional; browser voice otherwise) |
| `DAILY_SPEND_CAP_USD` | Hard cap on live model spend |
| `AUTH_STORE_PATH` | Persistent location for account/session data |

### 4. Deploy
```bash
vercel --prod
```

Run `npm run smoke` against the production URL before submitting.

---

## Built during the hackathon

Created during the **CTRL-V Hackathon** (Nov 7–11, 2026). Internal submit target: Nov 10, ~20:00 EAT. No pre-existing code reused — built during the hackathon.

**MIT License.**
