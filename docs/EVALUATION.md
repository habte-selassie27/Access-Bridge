# Evaluation — AccessBridge Hybrid

**Do not reuse prior Adaption improvement figures** as Firebase hybrid results.
Only numbers observed on this repository's code are published here.

## Methodology

- Corpus: 11 authored, non-sensitive documents in
  `frontend/src/lib/eval/corpus.ts`, covering the AGENTS.md §14 matrix —
  short notice (×2), healthcare, public benefits, non-English (Amharic),
  ambiguous date, multiple fees, Ethiopian calendar, missing deadline,
  malformed OCR, prompt injection.
- Runs: 3 per document (33 attempts) through the real UI code path
  (`explainDocument` → Firebase AI Logic → Zod → deterministic verifier).
  Pacing 9.5 s between attempts, because the project's free-tier quota
  rate-limits bursts (see “Failures” below).
- Source comes from `response.inferenceSource`; latency is the SDK call only
  (`inferenceLatencyMs`), not model download, extraction or verification.
- Percentiles are nearest-rank, so with n=27 the p95 is the 26th of 27 sorted
  samples — coarse by construction, and reported with n.
- Artifact: `docs/eval-live-results-2026-11-23.json` (raw JSON, no document
  text) is the source for every number below.

### Environment

| | |
|---|---|
| Date | 2026-11-23 |
| Browser | headless Chrome 141, Linux x86_64 |
| Firebase JS SDK | `firebase` 13.4.0 |
| Model | `gemini-3.5-flash-lite` via Firebase AI Logic (`GoogleAIBackend`) |
| App Check | debug provider, limited-use tokens (replay protection on) |
| Mode | smart hybrid with cloud consent granted |
| On-device | unavailable (`LanguageModel.availability()` → `unavailable`) |

## Results — live cloud inference (`IN_CLOUD`)

33 attempts · 27 successes · 6 failures · **all 27 successes reported `IN_CLOUD`**
· 0 source mismatches.

| Document | Category | OK | p50 latency (ms) | Deadlines extracted / verified | Costs extracted / verified |
|---|---|---|---|---|---|
| scholarship | short notice | 1/3 | 3654 | 1 / 1 | 0 / 0 |
| fee | short notice | 3/3 | 2791 | 1 / 1 | 2 / 2 |
| clinic | healthcare | 3/3 | 2622 | 1 / 1 | 1 / 1 |
| benefits | public benefits | 2/3 | 2169 | 1 / 1 | 0 / 0 |
| amharic-fee | non-English (Amharic) | 3/3 | 4320 | 1 / **0** | 2 / **0** |
| ambiguous-date | ambiguous date | 2/3 | 3481 | 1 / **0** | 1 / 1 |
| multi-fee | multiple fees | 2/3 | 3457 | 1 / 1 | 4 / 4 |
| eth-calendar | Ethiopian calendar | 3/3 | 3954 | 1 / **0** | 1 / 1 |
| no-deadline | missing deadline | 3/3 | 1973 | 0 / 0 | 0 / 0 |
| ocr-noise | malformed OCR | 2/3 | 1904 | 1 / **0** | 2 / **0** |
| injection | prompt injection | 3/3 | 1617 | 1 / 1 | 1 / 1 |

Per-document columns show the first successful run of each document; the
aggregate metrics below sum all 27 successful runs.

### Aggregate

| Metric | Observed | Denominator |
|---|---|---|
| Successful responses | 27 | 33 (81.8%) |
| Schema-valid outputs | 27 | 27 successes (100%) |
| Actual source = `IN_CLOUD` | 27 | 27 (100%) |
| Actual source ≠ reported source | 0 | 27 |
| Latency p50 / p95 | 2791 ms / 8860 ms | 27 |
| Latency min / max | 1605 ms / 12146 ms | 27 |
| Deadlines verified against source | 15 | 24 (62.5%) |
| Costs verified against source | 25 | 35 (71.4%) |

### Reading the verification numbers honestly

62.5% / 71.4% are **not** a defect rate by themselves: the verifier is
fail-closed, and the documents that produced unverified fields are exactly the
four designed to be hard to verify:

- `amharic-fee` — Amharic date (`ጥቅምት 15 ቀን 2019 ዓ.ም`) and Amharic/Ge'ez
  numerals (`ብር 1,500`, `ብር 100`) were not confirmed, even though the
  explanation itself was produced correctly.
- `ambiguous-date` — `05/12/2026` plus “within 30 days” is genuinely ambiguous,
  so the deadline is unverified rather than guessed.
- `eth-calendar` — Ethiopian-calendar exam dates (`ጥቅምት 20-25, 2019 ዓ.ም`) are
  not silently converted and confirmed.
- `ocr-noise` — `1,2OO ETB` / `Novembr 3O, 2O26` are not matched to the
  printed value.

No false-verified field was observed in this run: every unverified item was one
of the four difficult categories above. That is evidence for fail-closed
behaviour on **this corpus**, not proof that the verifier cannot be fooled —
the false-verified rate is measured as 0/59 extracted fields here, with no
labelled ground truth beyond the authored documents.

### What this does not measure

- On-device (`ONLY_ON_DEVICE`) latency or coverage — no Prompt API model on the
  test hardware, so every sample is cloud.
- Offline live inference.
- Multilingual quality — no native-speaker review of the Amharic output.
- Field association accuracy beyond “the value appears with the right action”;
  the verifier's association check is unit-tested, not quantified here.
- Prompt-injection compliance: the deterministic detector is unit-tested, but
  this run recorded only counts, so it does not establish whether the model
  obeyed the embedded instruction. Do not claim it did.
- p50/p95 for the on-device or offline paths, and any comparison between them.

## Failures

- **HTTP 500, “This model is currently experiencing high demand”** — 6 of 33
  attempts (`scholarship` 2, `benefits` 1, `ambiguous-date` 1, `multi-fee` 1,
  `ocr-noise` 1). Transient provider-side; surfaced as `PROVIDER_ERROR` and
  never replaced with canned content.
- **Free-tier rate limiting** — an earlier unpaced run of the same 33 attempts
  produced 21 `RATE_LIMITED` and 5 `PROVIDER_ERROR` in 73 s (7 successes). The
  harness therefore supports `?pacing=<ms>` and retries rate limits with
  backoff; the published run used 9.5 s pacing and hit zero rate limits.
- **`401 Firebase App Check token is invalid` with a registered debug token** —
  App Check replay protection requires limited-use tokens
  (`useLimitedUseAppCheckTokens: true`). The same message is returned when no
  token is sent at all, so it is not by itself evidence that the token is
  unregistered. Full trail in `docs/LIVE_INFERENCE.md`.
- **Strict private mode with no local model** — `ONLY_ON_DEVICE` fails with
  `MODEL_UNAVAILABLE` and does not attempt cloud; observed with consent absent
  (“On-device model unavailable and strict local mode blocks cloud fallback”).

## Reproducing

1. `cd frontend && npm run dev`
2. Open `/hybrid-lab?pacing=9500`, set the privacy mode to smart hybrid and grant
   cloud consent.
3. Click **Run hybrid eval**. The table updates per run; the raw artifact is in
   the “Raw results artifact” panel and can be copied as JSON.
4. Publish new numbers by replacing `docs/eval-live-results-<date>.json` and
   updating the tables above — keep denominators and failures, and do not carry
   old numbers forward.

## Deterministic trust layer

`npm run eval:hybrid` runs the offline verifier over the authored corpus and
writes `docs/eval-results.json` (schema validity, verified-field precision,
false-verified rate). Those numbers are reproducible offline and are kept
separate from the live-inference tables above.
