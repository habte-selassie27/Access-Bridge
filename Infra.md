# Infra.md — PasteWise

Deploy, env, CI, README, video, and submission ops. Goal: **a deployed link a judge can open on a phone in under 90 seconds**, and zero surprises at the deadline.

Related: `AGENTS.md`, `UI.md`, `Backend.md`.

---

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| App | Next.js (App Router) + TypeScript | UI + API in one deploy |
| Styling | Tailwind CSS + CSS variables | Fast, consistent, WCAG AA contrast |
| Validation | zod | Schema shared by API and UI |
| LLM | Provider-agnostic via adapter interfaces | Explanation, follow-up, translation |
| Vision/OCR | Provider-agnostic via adapter interfaces | Image and PDF text extraction |
| Voice | Web Speech API fallback + server TTS where a voice exists for the language | Voice for low-resource languages is the risky part; keep a fallback |
| Data/eval | Adaption (Invent-a-Dataset / Adaptive Data / AutoScientist as applicable) | Sponsor integration that must be load-bearing |
| Hosting | Vercel | One-click, preview URLs |
| PWA | Manual manifest + service worker | Low-bandwidth, installable, offline demo |
| Rate limit | In-memory (MVP) or Upstash Redis | Protect API budget |

Rule: don't stack a new framework + a new domain + a new tool all at once. Stay on tools you know; only the Adaption part is new.

## 2. Environments & env vars

`.env.example` (committed), `.env.local` (never committed):

```
NODE_ENV=development
APP_URL=http://localhost:3000

LLM_PROVIDER=
LLM_MODEL=
LLM_API_KEY=

OCR_PROVIDER=
OCR_API_KEY=

TRANSLATION_PROVIDER=
TRANSLATION_API_KEY=

TTS_PROVIDER=
TTS_API_KEY=

ADAPTION_API_KEY=          # confirm exact name/usage in Adaption docs

RATE_LIMIT_ENABLED=true
MAX_TEXT_LENGTH=20000
MAX_FILE_SIZE_MB=8
MAX_DAILY_SPEND=
MAX_REQUEST_COST=
LOG_LEVEL=info

DEMO_MODE_DEFAULT=false
```

- Secrets only on the server. Nothing sensitive in `NEXT_PUBLIC_*`.
- Set the same vars in Vercel (Preview + Production).
- Spend cap enforced in code (see `Backend.md`), plus a billing limit on the provider dashboard.
- Validate required variables at startup (see `/lib/config/env.ts`).
- Do not require live provider credentials for demo mode.

## 3. Repo hygiene (judges read the history)

- **Public GitHub repo from hour one.** Create it today.
- Small, frequent commits with real messages. No giant single commit at the end.
- Branches: `main` (always deployable) + short-lived feature branches.
- `.gitignore`: `.env*`, `node_modules`, `.next`, audio caches.
- Add a LICENSE (MIT).
- If you reuse any past repo/mechanism, say so in the README ("pre-existing work" vs "built during the hackathon"). The rules require the project be created during the hackathon.

## 4. Deploy

Backend.md requires a single Next.js deployment with these properties:

1. Push repo → import to Vercel → set env vars → deploy `main`.
2. Use Node.js runtime for file processing routes; avoid Edge runtime for Node-only dependencies.
3. Set explicit route runtime configuration and function execution timeouts (long enough for vision calls).
4. Confirm on a real phone over mobile data (not just Wi-Fi).
5. Configure proxy headers correctly; do not trust arbitrary `X-Forwarded-For`.
6. No sensitive response caching; use `Cache-Control: no-store` on processing responses.
7. Custom domain is optional; a clean `pastewise.vercel.app` is fine.
8. **Deploy a working skeleton today (Day 1)**, then iterate. Never first-deploy on the last day.
9. Run `npm run smoke` against production before submitting.

## 5. PWA & low bandwidth

- Manifest + icons, `display: standalone`, theme color.
- Cache app shell + fonts + demo docs so **demo mode works offline**.
- Images downscaled client-side before upload (≈1280px max edge, JPEG ~0.8).
- Lazy-load audio; don't autoplay.

## 6. Observability (lightweight)

Match `Backend.md` section 16:

- Structured logging: log request id, doc type, lang, latency, outcome, verified/unverified field counts. **Never log document contents, personal names, addresses, or API keys.**
- Core metrics: total requests, success/failure rate, OCR failure rate, LLM timeout rate, schema validation failure rate, verification rate, average/P95 processing time, provider cost per request, rate-limit rejections, demo vs live count.
- Request tracing: one request ID across all processing stages (validation, extraction, detection, explanation, verification, translation, response).
- `/api/health` for quick liveness checks; `/api/health/ready` for readiness.
- Add a `npm run smoke` (see `Backend.md`) and run it against the production URL before submitting.

## 7. CI (optional, only if it takes <20 min)

Match `Backend.md` section 18:

GitHub Action: install → typecheck → lint → unit tests (`verify`, `schema`) → integration tests. No heavy pipelines. A red build near the deadline is worse than no CI.

Test layers:
- Unit: Zod schemas, source normalization, Ge'ez numerals, date parsing, Ethiopian calendar, currency/amount matching, evidence verification, rate limiting, spend guard.
- Integration: text explanation, image OCR, PDF extraction, demo processing, follow-up, TTS fallback, provider timeout, malformed model response.
- Security: oversized payloads, invalid MIME types, prompt injection, rate-limit bypass, spend-limit bypass, sensitive log leakage.

## 8. Demo & video ops

- **Backup video first:** record a rough demo video on Day 1 (demo mode). Re-record at the end. A backup saves you if the final build breaks.
- Record at a sane hour (≈8pm, not 4am).
- Structure (≤3 min): first 15s show it working; problem in one sentence; live flow; eval before/after; impact close. ~60% explaining / 40% demoing.
- Use a real-looking (synthetic) document. No real personal data on screen.
- Keep voice clear and not too fast. Add captions if time allows.
- Export 1080p, upload to YouTube (unlisted is fine) or Loom, test the link logged out.

## 9. README template (carries half the score)

```
# PasteWise
One sentence: Ctrl+V for confusing paperwork, explained in your own language, with voice.

## How to test (30 seconds)
- Live: <url>  → click "Try an example" → pick a document → switch language → press Listen.
- Demo works with no API keys. Local: `npm i && npm run dev`, then `npm run smoke`.

## Problem (2 sentences)
## Solution + screenshots
## Architecture (diagram)
## How we use Adaption and why (load-bearing, with measured before/after)
## Eval results (link to /eval, include failure cases)
## What's honestly unfinished / limitations
## Future work (the cut list)
## Privacy (documents are not stored)
## Built during the hackathon (and any pre-existing code, clearly marked)
## Tech stack, license
```

## 10. Submission runbook

**T-minus plan (all times EAT, deadline Nov 11 01:00):**

| When | Action |
|---|---|
| Nov 10, 14:00 | Feature freeze. Only bug fixes after this. |
| Nov 10, 16:00 | Final video recorded; README finalized; links tested logged out and on phone. |
| Nov 10, ~20:00 | **Submit on Devpost.** (4+ hours early.) |
| Nov 10, 20:00–23:00 | Edit/polish after submitting (Devpost allows edits). Re-run smoke. |
| Nov 11, 00:00 | Hands off. Verify the submission page renders. |

**Final checks**
- [ ] Production URL loads on mobile data; demo mode works.
- [ ] `npm run smoke` passes against production.
- [ ] Repo is public, history is visible, README has "How to test" on top.
- [ ] Video link works logged out.
- [ ] Adaption usage is explained and visible on `/eval`.
- [ ] All Devpost fields filled; "What's still broken" answered honestly.
- [ ] Screenshots attached.
- [ ] Join the hackathon Discord (it's on the to-do list) in case organizers post updates.

## 11. Risk register

| Risk | Mitigation |
|---|---|
| Live API fails during judging | Demo mode + cached outputs + backup video |
| Low-resource TTS unavailable | Web Speech fallback; show text prominently |
| Amharic output quality weak | Confidence banner; honest eval; lead the demo with the strongest language |
| API cost spike | Rate limit + daily cap + provider billing limit |
| OCR fails on photos | Pasted text path is primary; photo is bonus; pre-tested sample photo |
| Time runs out | Cut stretch features first, then follow-up, never demo mode or the eval page |
| Deploy breaks late | Feature freeze, deploy skeleton early, never deploy on deadline night |

## 12. After the deadline

Most projects die after submission; ones still shipping a week later stand out. Post an update on the Devpost project, keep the repo active, and note next steps in the README.
