# AGENTS.md — PasteWise

> Ctrl+V for confusing paperwork. Paste or snap any official document, get a plain-language explanation, a checklist, and a voice readout in your own language (Amharic, Oromo, Tigrinya, English, more).

Read this first. Then read the doc for the area you're touching: `UI.md`, `Backend.md`, `Infra.md`.

---

## 0. Hackathon facts (do not forget)

- **Event:** CTRL-V Hackathon (Devpost). Theme: use AI + tech to remove access barriers.
- **Deadline:** Nov 11, 2026, 1:00am GMT+3. **Our internal submit target: Nov 10, ~20:00 EAT** (4+ hours early, tips: everyone hits the deadline at once).
- **Participants:** ~103. Prizes go 1st/2nd/3rd + 100 participation awards. Submitting something working beats nothing.
- **Sponsor:** Adaption (AutoScientist, Adaptive Data, Invent-a-Dataset, 242 languages). Our integration must be **load-bearing**, not bolted on.

## 1. The one-line belief (the pitch)

> If a document decides your access to healthcare, money, or services, you should be able to understand it in your own language in 10 seconds.

If a feature doesn't serve that line, cut it.

## 2. Rubric = spec sheet

| Criterion | Weight | What we do about it |
|---|---|---|
| Impact | 30% | Real docs, real languages, real users (low literacy, non-native readers). Demo shows a person who *couldn't* act, then *can*. |
| Innovation | 25% | Paste metaphor + voice-first + low-resource languages + measured quality via Adaption data. |
| Technical | 25% | Structured output, deterministic verification, OCR/vision, TTS, eval harness with before/after numbers. |
| UX | 10% | Mobile-first, big type, one screen, works on bad networks. |
| Presentation | 10% | 3-min video, README with "How to test" on top, honest limitations. |

Impact + Innovation = 55%. Spend effort there, not on infra polish.

## 2b. Rules that come from the tips

- **Scope for the demo, not the roadmap.** Happy path first, make it bulletproof. Cut list goes in README as "Future work".
- **Demo flow works end to end by end of Day 1 (halfway mark).** Otherwise cut a feature, then cut another.
- **Keep the model out of verdicts.** The LLM proposes and explains. Dates, amounts, and deadlines are **verified by deterministic code** against the source text. Never show a number or date that isn't found in the source.
- **Agent proposes, human disposes.** Show extracted deadlines/costs as suggestions with a "Check against original" link. Never claim legal certainty.
- **Show misses, not just wins.** The eval page publishes failure cases honestly.
- **Name it like a product.** PasteWise stays. Short, hints at what it does.

## 3. Scope (hard cap)

**IN (must ship):**
1. Paste text (+ upload photo/PDF).
2. Structured output: *What this is / What you must do / Deadline & cost / Documents to bring.*
3. Language switcher (Amharic, Oromo, Tigrinya, English minimum) + voice readout.
4. Follow-up question box.
5. Demo mode with 3 pre-loaded documents (cached, never stalls).
6. Eval page: baseline vs Adaption-improved output.

**OUT (README future work):** accounts, history, push reminders, native app, offline OCR, payments, B2B dashboards, any new document types beyond the 3 demo ones.

**Stretch only if everything above is done and the backup video is recorded:** low-bandwidth PWA install, share-as-image.

## 4. Repo layout

```
app/
├── api/
│   ├── explain/
│   │   └── route.ts
│   ├── followup/
│   │   └── route.ts
│   ├── tts/
│   │   └── route.ts
│   ├── health/
│   │   └── route.ts
│   └── eval/
│       └── route.ts
├── eval/
│   └── page.tsx
components/
├── layout/
│   ├── AppShell.tsx
│   ├── Header.tsx
│   └── Footer.tsx
├── input/
│   ├── PasteBox.tsx
│   ├── FileUploader.tsx
│   ├── CameraCapture.tsx
│   ├── FilePreview.tsx
│   ├── LanguageChips.tsx
│   └── DemoPicker.tsx
├── processing/
│   ├── ProcessingPanel.tsx
│   └── ProcessingSkeleton.tsx
├── result/
│   ├── ResultView.tsx
│   ├── DocumentOverview.tsx
│   ├── ActionChecklist.tsx
│   ├── DeadlineCard.tsx
│   ├── CostCard.tsx
│   ├── DocumentsCard.tsx
│   ├── VerificationSummary.tsx
│   ├── ConfidenceBanner.tsx
│   └── ResultDisclaimer.tsx
├── evidence/
│   ├── OriginalDocumentViewer.tsx
│   ├── EvidenceHighlight.tsx
│   └── SourceQuote.tsx
├── followup/
│   ├── FollowUpSheet.tsx
│   ├── MessageList.tsx
│   ├── MessageInput.tsx
│   └── SuggestedQuestions.tsx
├── audio/
│   ├── ListenButton.tsx
│   ├── AudioControls.tsx
│   └── AudioStatus.tsx
├── common/
│   ├── StatusBadge.tsx
│   ├── StatusToast.tsx
│   ├── ErrorState.tsx
│   ├── EmptyState.tsx
│   └── LoadingSpinner.tsx
└── eval/
    ├── EvalOverview.tsx
    ├── MetricCard.tsx
    ├── LanguageComparison.tsx
    ├── SampleComparison.tsx
    └── FailureCases.tsx
lib/
├── domain/
│   ├── document.ts
│   ├── evidence.ts
│   ├── verification.ts
│   ├── confidence.ts
│   └── errors.ts
├── services/
│   ├── document.service.ts
│   ├── explanation.service.ts
│   ├── followup.service.ts
│   ├── translation.service.ts
│   ├── speech.service.ts
│   └── pipeline.service.ts
├── providers/
│   ├── interfaces.ts
│   ├── llm/
│   │   ├── llm.factory.ts
│   │   └── llm.adapter.ts
│   ├── ocr/
│   │   ├── ocr.factory.ts
│   │   └── ocr.adapter.ts
│   ├── translation/
│   │   └── translation.adapter.ts
│   └── tts/
│       └── tts.adapter.ts
├── extractors/
│   ├── dates.ts
│   ├── amounts.ts
│   ├── deadlines.ts
│   └── entities.ts
├── verify/
│   ├── index.ts
│   ├── source-normalizer.ts
│   ├── date-verifier.ts
│   ├── amount-verifier.ts
│   ├── evidence-verifier.ts
│   └── calendar/
│       ├── ethiopian.ts
│       ├── gregorian.ts
│       └── conversion.ts
├── prompts/
│   ├── index.ts
│   ├── explain.ts
│   ├── detect.ts
│   ├── followup.ts
│   └── translation.ts
├── schema/
│   ├── request.schema.ts
│   ├── response.schema.ts
│   ├── extraction.schema.ts
│   └── common.schema.ts
├── security/
│   ├── input-guard.ts
│   ├── file-validator.ts
│   ├── rate-limit.ts
│   ├── spend-guard.ts
│   └── content-isolation.ts
├── config/
│   ├── env.ts
│   ├── limits.ts
│   └── providers.ts
├── observability/
│   ├── logger.ts
│   ├── metrics.ts
│   └── tracing.ts
├── utils/
│   ├── errors.ts
│   ├── timeout.ts
│   ├── retry.ts
│   └── ids.ts
└── api/
    ├── client.ts
    ├── explain.ts
    ├── followup.ts
    ├── tts.ts
    └── types.ts
data/
└── demo/
    ├── government-notice.json
    ├── medical-document.json
    └── financial-document.json
eval/
├── datasets/
├── runners/
├── metrics/
└── results/
tests/
├── unit/
├── integration/
├── security/
├── fixtures/
└── regression/
AGENTS.md UI.md Backend.md Infra.md README.md
```

## 5. Working agreement for coding agents

Follow this loop on every task:

1. **Spec before prompt.** State: what to do, what to touch, what **not** to break.
2. **Tests first** for anything in `/lib/verify` and `/lib/schema`.
3. **One feature per session.** Fresh context each time. Re-read this file.
4. **Read every diff.** No blind accepts.
5. If it fails twice the same way, the prompt is wrong. Reset and rewrite the spec.
6. **The boring option is allowed.** No new libraries, abstractions, or state managers unless a task says so.
7. When debugging, paste the **exact error and line**. Don't ask the agent to guess causes.
8. Commit small and often. **Large single commits are a red flag**; keep visible history across the hackathon.

### Do not break (invariants)

- `/api/explain` always returns schema-valid JSON or a clean error. Never raw model text.
- Verified fields (`deadline`, `cost`) are only shown if verification passed.
- Demo mode works with **no network and no API keys**.
- The first screen is the paste box. No landing-page fluff in front of the product.
- Secrets never reach the client.
- The LLM proposes; deterministic code verifies. Never trust LLM-generated verification flags.
- No date, amount, deadline, or critical fact may be presented as verified unless traceable to the original source.
- No business logic inside route handlers; route handlers delegate to application services.
- Provider-independent interfaces; domain and application layers never import provider SDKs directly.
- Processing failures never silently become successful results.
- OCR output is never treated as ground truth.
- Synthetic evaluation results are never reported as production results.

### Backend phase order (from Backend.md)

Follow this sequence strictly. Do not begin the next major stage until the current stage passes its tests.

| Phase | Implementation |
|---|---|
| 1 | Project structure and configuration |
| 2 | Domain and Zod schemas |
| 3 | Source normalization |
| 4 | Verification engine |
| 5 | Demo mode |
| 6 | LLM abstraction |
| 7 | Text explanation API |
| 8 | Follow-up API |
| 9 | OCR and file processing |
| 10 | Translation engine |
| 11 | Adaption integration |
| 12 | TTS |
| 13 | Security and reliability |
| 14 | Observability |
| 15 | Evaluation dashboard |
| 16 | Production readiness |

## 6. Definition of done (per feature)

- Works on the happy path on a phone-size viewport.
- Has a loading state, an error state, and an empty state.
- Demo-mode fallback exists.
- Added a line to README (what it does / how to test).
- Passes unit, integration, and security tests for its layer.
- Has a smoke-test entry in `npm run smoke`.

## 7. Timeline (today is Nov 7)

| When | Goal |
|---|---|
| Nov 7 (Day 1) | Paste → structured explanation → language switch, deployed. Demo docs cached. **Record backup demo video v0.** |
| Nov 8 (Day 2) | Photo/PDF input, voice readout, follow-up, Adaption dataset + eval before/after. |
| Nov 9 (Day 3) | Polish (reserve ≥15% of total time), README, screenshots, final video recorded at a sane hour (not 4am). |
| Nov 10 evening | **Submit by ~20:00 EAT.** Then edit/polish after. |
| Nov 11 00:00 | Do nothing risky. Deadline is 01:00 GMT+3. |

Keep this deadline in one list with any other hackathons you're chasing.

## 8. Submission checklist (Devpost)

- [ ] Project name + short description
- [ ] Detailed description: problem, why it matters, how it works
- [ ] Demo video (aim ≤3 min; first 15s show it working, not slides/logo)
- [ ] Technologies used
- [ ] Public GitHub repo with README (How to test at top) and real commit history
- [ ] Deployed link works on mobile
- [ ] Screenshots
- [ ] "What's still broken" answered honestly

## 9. Demo script (≤ 3 min)

1. **(0–15s)** Problem in one sentence over a real scary notice: "This is a notice millions of people can't read." Then show the working product immediately.
2. **(15–60s)** Paste it. Amharic explanation + checklist + voice readout.
3. **(60–100s)** Photo of a paper document → same result. Follow-up question.
4. **(100–150s)** Eval page: baseline vs Adaption-improved Amharic/Oromo output, with honest failure cases.
5. **(150–180s)** Impact close: "Anyone can access what they need, just by pasting."

Spend ~60% explaining, 40% demoing. Rehearse out loud once. Solo = budget explicit pitch time.

## 10. Honest limitations (copy to README)

- Not legal/medical advice; outputs are explanations, always verify with the issuer.
- Low-resource language quality varies; see eval page for measured gaps.
- OCR struggles with handwriting and bad lighting.
