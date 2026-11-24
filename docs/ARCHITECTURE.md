# Architecture — AccessBridge Hybrid

## Stack
- Frontend: Vite + React 19 + TypeScript + Tailwind 4 (Vercel).
- Backend: Express 5 + TypeScript (Railway) — retained for OCR, TTS, eval, auth, URL import.
- AI: Firebase AI Logic (client SDK `firebase/ai`) — hybrid on-device (Gemini Nano via Chrome Prompt API) + cloud (Gemini via Firebase).

## Hybrid entrypoints
- `frontend/src/lib/hybrid/ai.ts` — initHybrid, getHybridModel, hybridGenerateText, hybridGenerateStructured, getDeviceModelAvailability.
- `frontend/src/lib/hybrid/config.ts` — env-driven Firebase config, App Check debug token, inference mode, cloud model.
- `frontend/src/lib/hybrid/schema.ts` — Firebase `Schema` structured-output definitions.
- `frontend/src/lib/hybrid/remoteConfig.ts` — Firebase Remote Config (non-secret flags).
- `frontend/src/lib/privacy/{modes,consent,storage}.ts` — privacy modes, consent, persistence.

## Runtime AI call path
1. UI calls `explainDocument` / `followupQuestion` / workspace APIs with a `privacyMode`.
2. Consent gate: cloud modes require `ab_privacy_consent_v1.cloudConsented`.
3. Mode mapping: private→ONLY_ON_DEVICE, smart (consented)→PREFER_ON_DEVICE, smart (unconsented)→ONLY_ON_DEVICE, cloud→ONLY_IN_CLOUD.
4. `hybridGenerate*` calls `getGenerativeModel(...).generateContent()` (Firebase AI Logic).
5. `result.response.inferenceSource` (ON_DEVICE/IN_CLOUD) is the truth of where it ran.
6. Output parsed → Zod-validated → `toFrontendResult` recomputes verification against source text.
7. Strict private mode never falls back to server/cloud.

## Verification
- Deterministic, shared (`frontend/src/lib/verify.ts` + `transform.ts`), runs both server and client. Model never sets verification flags.
```