# Baseline audit — AccessBridge (pre-#BuildHybridAI pivot)

Date: 2026-11-23. Auditor: coding agent. Scope: full repository at commit before rebuild.

## Confirmed (working, verified by running)

- Frontend builds: `cd frontend && npm run build` succeeds (Vite 8 + React 19 + TS).
- Backend typechecks: `tsc --project server/tsconfig.json` succeeds.
- Tests: `npm test` → 131/131 pass (unit: verify, state, verification-guards, a11y, retrieval, auth, tts, completeness).
- Smoke: `npm run smoke` → all checks pass.
- Demo mode: 4 bundled demos (demo-1..4) resolve in 4 languages; verification hydrated client-side.
- Deterministic verifier (`frontend/src/lib/verify.ts`) runs both server and client; `toFrontendResult` recomputes verification (fail-closed).
- Explain/followup/simplify/translate/glossary/compare/eligibility routes registered on Express.
- OCR via server (`/api/extract`), URL import, auth, TTS routes present.
- Firebase hybrid module present at `frontend/src/lib/hybrid/` (ai, config, schema, remoteConfig, index) — config-driven via `VITE_FIREBASE_*`.
- Hybrid explain/followup/workspace paths call `firebase/ai` `getGenerativeModel(...).generateContent()` at runtime; `inferenceSource` surfaced in UI badge.

## Partially implemented

- Firebase hybrid path: present but uses `PREFER_ON_DEVICE` everywhere with silent server fallback; no strict `ONLY_ON_DEVICE` mode, no consent gating, no privacy-mode selector. (Violates new spec §7/§8.)
- App Check: initialized with ReCaptchaEnterpriseProvider; debug-token flow documented but not end-to-end tested against a real Firebase project (no project configured in this environment).
- Remote Config: helper present; not wired into consent or mode selection.
- Inference badge: shows ON_DEVICE/IN_CLOUD but no "Bundled demo" distinction, no Hybrid Insight drawer (requested mode, timing, connectivity, verification counts).
- Capability detection: `getDeviceModelAvailability()` checks `LanguageModel.availability()` but is not surfaced in UI.
- Privacy modes: none. No `ONLY_ON_DEVICE` strict mode; no consent modal.
- Model download progress: `initializeDeviceModel` callback exists but not surfaced.
- Language quality: `languageTier()` exists; experimental languages not honestly labeled in UI beyond eval.

## Missing (per new spec)

- `docs/BASELINE_AUDIT.md` (this file, now created).
- `docs/ARCHITECTURE.md`, `PRIVACY_DATAFLOW.md`, `TEST_MATRIX.md`, `EVALUATION.md`, `SUBMISSION.md`, `DEMO_SCRIPT.md`.
- Privacy & AI Status bar (capability, network, privacy preference) on first screen.
- Privacy mode selector (Private device only / Smart hybrid / Cloud for complex documents) with informed consent.
- Strict local mode that never silently uploads document content.
- Consent gating before cloud transfer.
- Hybrid Insight drawer with non-sensitive telemetry.
- Offline PWA shell with explicit offline-state separation.
- Real on-device verification on supported Chrome hardware (not testable in this environment).
- Fresh evaluation harness for hybrid advantage (existing eval is Adaption-themed).

## Broken

- None blocking build/test. (No compile errors.)

## Not tested

- Real Firebase cloud inference (no Firebase project configured here).
- Real on-device Gemini Nano inference (no Chrome 139+ with Prompt API in this environment).
- App Check enforcement end-to-end.
- Privacy leakage (network interception) — no tests.
- Consent gating — no tests.
- Strict local mode refusal — no tests.
- `hybridGenerateStructured` on real on-device model (schema constraint).

## Key paths

- Frontend: `frontend/src/` (Vite + React 19 + TS + Tailwind 4).
- Backend: `server/` (Express 5 + TS on Railway).
- Hybrid: `frontend/src/lib/hybrid/{config,ai,schema,remoteConfig,index}.ts`.
- API: `frontend/src/lib/api/{explain,followup,workspace}.ts`.
- Verification: `frontend/src/lib/verify.ts`, `frontend/src/lib/transform.ts`.
- Schemas: `frontend/src/lib/schema.ts`.
- Prompts: `frontend/src/lib/prompts.ts`.

## Notes

- Existing Groq/Mistral LLM code remains in `server/` as legacy; frontend no longer calls server LLM for explain/followup/etc. (uses hybrid first). Server retained for OCR, TTS, eval, auth.
- MIT license present at repo root (`LICENSE`).
- `firebase` v13.4.0 installed.
```

Now let me implement the privacy mode system. I'll create:
- `frontend/src/lib/privacy/modes.ts` — PrivacyMode type, mapping to SDK modes, consent storage.
- `frontend/src/lib/privacy/consent.ts` — consent state (localStorage), requiresConsent logic.
- Update hybrid/ai.ts to accept a mode override and add `ONLY_ON_DEVICE` path without fallback.
- Update explain.ts/followup to take privacyMode param and enforce consent.
- Add a PrivacyModeSelector component and HybridStatus bar.
- Wire into Home.

Let me design carefully.

PrivacyMode: "private" | "smart" | "cloud".
- private → SDK ONLY_ON_DEVICE. No server fallback. If fails → typed error, no cloud.
- smart → SDK PREFER_ON_DEVICE, but only if consent given; else ONLY_ON_DEVICE. Actually spec: Smart hybrid cloud fallback only after user knowingly opted in. So: if consent → PREFER_ON_DEVICE; if no consent → ONLY_ON_DEVICE (or block). I'll require consent for any cloud transfer.
- cloud → SDK ONLY_IN_CLOUD. Requires consent.

Consent: stored in localStorage key `ab_privacy_consent_v1` as { cloudConsented: boolean, consentedAt: number }. Consent is required before any cloud transfer of document content. First time smart/cloud mode selected, show consent modal; on accept, set consented.

Let me implement. First the privacy module.<|end|><|start|>Assistant to=bash<|channel|>analysis <|constrain|>xml<|message|><rfl:parameter name="command">
mkdir -p /home/izzy/Pictures/PasteWise/frontend/src/lib/privacy /home/izzy/Pictures/PasteWise/frontend/src/components/hybrid