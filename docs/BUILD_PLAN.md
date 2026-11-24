# AccessBridge Hybrid — Complete Build Inventory

Source of truth: `AGENTS.md` (#BuildHybridAI 2026). This file maps every required feature and task to the actual repository, marks current status, and orders work by the dependency gates (§24) and timebox (§17).

Status legend: ✅ done (code+tests) · 🟡 partial · ⬜ not started · 🔒 needs your environment/hardware/action.

---

## A. Product features (what the app must do)

### A1. Document intake
- Paste text / TXT upload (preserve original for verification). ✅
- PDF extraction (local if possible; page IDs; scanned→OCR). 🟡 (server OCR exists; local PDF extraction ⬜)
- Image JPEG/PNG/WEBP (signature validation; keep original; disclose OCR locality). 🟡
- Camera capture (permission after action; review before analysis; no auto-upload). 🟡 (component exists; privacy gating ⬜)
- URL import (server SSRF-protected; never called offline/private). ✅
- Input limits: size/MIME/length; clear empty/oversized errors. ✅

### A2. Understand (explanation)
- Structured explanation: docType, summary, actions, eligibility, howToApply, deadlines, costs, documentsToBring, sections, glossary, contacts, examples, warnings, limitations. ✅
- Reading levels Simple/Standard/Detailed (same verified facts). ✅
- Language selection EN/AM/OM/TI (+experimental labeled). ✅
- Single-turn grounded follow-up Q&A (fresh prompt, not on-device chat). ✅
- Simplify / Translate / Glossary / Compare / Eligibility via hybrid. ✅

### A3. Trust / verification
- Deterministic source verifier (dates, amounts, quotes, contacts, Ge'ez, Ethiopian calendar). ✅
- Evidence spans linked to original; click→highlight. ✅
- Fail-closed: model never sets verified; unverified→"Check original"; ambiguous labeled. ✅
- OCR uncertainty disclosed; original kept visible. 🟡
- Field association (value tied to correct action), not just string presence. 🟡 (verifier matches presence; association ⬜ strengthen)

### A4. Act
- Action checklist with urgency + completion (local). ✅
- Export checklist locally. ✅ (Actions .txt download)
- Clear documents/explanations/history. ✅ (Settings clearEverything)

### A5. Privacy / hybrid (centerpiece)
- Firebase AI Logic imported+invoked at runtime (real generateContent). ✅
- Modes: Private(ONLY_ON_DEVICE)/Smart(PREFER_ON_DEVICE)/Cloud(ONLY_IN_CLOUD). ✅
- Consent gating before cloud transfer; revoke→strict local. ✅
- Strict private: no silent cloud/server fallback; typed errors. ✅
- Actual source badge from response.inferenceSource (On device/In cloud/Bundled demo). ✅
- App Check (debug dev + production attestation). 🟡 (configured; enforcement 401 being resolved 🔒)
- Capability detection (unavailable/downloading/ready) surfaced. ✅
- initializeDeviceModel on user gesture; download progress surfaced. ✅ (HybridStatus prepare button + real %)
- Hybrid Insight drawer (mode, source, latency, connectivity, verification counts; no doc text). ✅
- Remote Config non-secret flags. ✅
- Prompt-injection defense (isolate doc; refuse embedded instructions). ✅ (client input-guard + adversarial tests)
- 9,216-token local budget; no silent truncation; chunk+merge long docs. ✅ (client budget + chunk/merge wired into explain)

### A6. Languages / accessibility
- EN+AM tested demo pair; OM/TI retained with eval status. 🟡
- RTL rendering; logical CSS; numbers/URLs readable. 🟡
- Semantic headings/landmarks; labels; visible focus; reduced motion; high contrast; font size; keyboard-only flow. 🟡 (a11y module exists; full audit ⬜)
- Voice output: local/browser voices transparent; cloud TTS distinct consent; no false language claims. 🟡
- Voice input optional; provider privacy disclosed; text fallback. 🟡

### A7. Offline / PWA truthfulness
- App shell cached; loads offline. ✅ (sw.js)
- Bundled demos render offline (labeled precomputed). ✅
- Real local model generates offline (after download) — prove on hardware. 🔒
- Cloud unavailable offline; explicit states. 🟡
- SW never caches private API responses/doc content. ✅

### A8. Evaluation (hybrid advantage)
- Harness comparing ONLY_ON_DEVICE / ONLY_IN_CLOUD / PREFER_ON_DEVICE / offline-live / bundled-demo(excluded). 🟡 (HybridEval UI + offline trust harness ✅; live on-device runs 🔒)
- Metrics: success+error class, schema validity, exact deadline/cost+association, verified precision & false-verified=0, eligibility fidelity, language correctness, p50/p95 latency (download vs inference), cloud count/opt-in, offline live count, a11y+task completion. ⬜
- Publish denominators+failures; no reused Adaption numbers. ⬜
- Eval dashboard shows hybrid metrics (not sponsor hero). 🟡

### A9. Security / privacy
- No raw doc text/prompts/tokens logged. ✅ (audit done: hybrid errors log classified code only; server logs metadata only)
- Local storage retention/deletion controls. 🟡
- No Firestore by default; if added, deny-by-default rules+tests. ⬜ (deferred)
- Secrets server-side; no service-account keys in bundle. ✅
- File/MIME/size, Zod, SSRF, CORS, rate limit, no-store. ✅

---

## B. Engineering tasks by phase (gate order)

### Phase A — Real inference (WP-001..016)
- WP-001/002 audit+baseline ✅ (docs/BASELINE_AUDIT.md)
- WP-003 preservation (baseline tag/branch) ⬜
- WP-006/007 Firebase project+App Check 🔒 (resolve 401 enforcement)
- WP-008 SDK init+runtime call ✅
- WP-009 capability detection ✅
- WP-010 cloud model config/timeout/errors 🟡
- WP-011..014 routing modes/auto/prefer/cloud ✅ (privacy router)
- WP-015 model readiness UX (download progress, retry) 🟡
- WP-016 typed request/response envelope 🟡

### Phase B — Trustworthy workflow (WP-017..042)
- WP-017 JSON parse+Zod+reject model verification flags ✅
- WP-018 prompt design (untrusted doc, uncertainty, source excerpts) ✅
- WP-019 prompt-injection adversarial tests ⬜
- WP-020 local task sizing (9,216 budget) ⬜
- WP-021 long-doc chunk+offsets+merge+coverage warning 🟡
- WP-022..026 intake (text/PDF/image/camera/URL) 🟡
- WP-027 OCR routing+consent+uncertainty 🟡
- WP-028 evidence IDs/offsets ✅
- WP-029/030 date/currency extraction ✅
- WP-031 eligibility fidelity ✅
- WP-032 contacts/URL safety 🟡
- WP-033 glossary source-linked ✅
- WP-034/035 action cards+checklist persistence+export 🟡
- WP-036 source viewer highlight+keyboard ✅
- WP-037 confidence semantics ✅
- WP-038/039 languages+reading levels ✅
- WP-040 RTL 🟡
- WP-041/042 voice out/in 🟡

### Phase C — Privacy/offline/security (WP-043..050)
- WP-043 offline shell ✅
- WP-044 offline AI truthfulness (unseen input, real local) 🔒
- WP-045 connectivity state 🟡
- WP-046 privacy controls+consent revoke ✅
- WP-047 sensitive handling/no PII logs 🟡
- WP-048 Firestore rules ⬜ (deferred)
- WP-049 Remote Config ✅
- WP-050 auth decision (core account-free) ✅

### Phase D — Quality/eval/release (WP-051..072)
- WP-051/052 a11y foundation+visual ⬜ audit
- WP-053 error design (typed, human, retry) 🟡
- WP-054 telemetry schema (no doc text) ✅
- WP-055/056/057 latency/quality/hybrid benchmarks ⬜
- WP-058 eval dashboard hybrid metrics 🟡
- WP-059 unit tests (router/consent/schema/verifier) ✅ (privacy-routing + trust-schema added; 159 pass)
- WP-060 integration tests (Firebase mocks + live) ⬜
- WP-061 E2E (paste→action, highlight, consent, offline) ⬜
- WP-062 performance (bundle, lazy PDF/OCR) ⬜
- WP-063/064 deploy frontend/backend 🔒
- WP-065 README ✅ (update)
- WP-066 open-source (LICENSE, no secrets) 🟡 (check-secrets script ⬜)
- WP-067 Devpost description ⬜
- WP-068/069 demo storyboard+recording 🔒
- WP-070 submission audit (validate-submission script ⬜)
- WP-071 release freeze 🔒
- WP-072 post-hackathon roadmap ⬜

---

## C. Tests to add (unit, no paid calls)
- hybridRouting.test.ts: mode→SDK mapping; consent gating; strict-local no-fallback.
- privacyPolicy.test.ts: consent grant/revoke; requiresNetwork; cloud blocked w/o consent.
- verification.test.ts: false-verified=0 corpus; ambiguous; association.
- schema.test.ts: malformed/fenced JSON; unknown flags rejected.
- offline.test.ts: shell vs demo vs live-local states.
- injection.test.ts: instruction override, fake system, hidden unicode.

## D. Docs & submission deliverables
- README (value, setup, Firebase/AppCheck, privacy modes, limitations, tests). ✅ update
- LICENSE (MIT). ✅ verify
- docs/ARCHITECTURE.md ✅ · PRIVACY_DATAFLOW.md ✅ · TEST_MATRIX.md ✅ · EVALUATION.md 🟡 fill real · SUBMISSION.md ✅ · DEMO_SCRIPT.md ✅ · BASELINE_AUDIT.md ✅ · BUILD_PLAN.md (this) ✅
- scripts/run-hybrid-eval.ts ✅ · validate-submission.ts ✅ · check-secrets.ts ✅
- Public YouTube ≤3min 🔒 · Devpost form 🔒 · hosted URL 🔒

## E. Immediate next actions (priority)
1. Resolve App Check 401 enforcement (🔒) so real cloud call succeeds.
2. Add privacy/router/injection unit tests (Gate D/E).
3. Local 9,216-token budget + long-doc client chunking.
4. Model download progress UI + retry.
5. Checklist export + global clear.
6. Fresh hybrid eval harness + fill EVALUATION.md.
7. Deploy + validate-submission + check-secrets.
8. Record video + Devpost.