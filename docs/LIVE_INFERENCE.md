# Live hybrid inference — verification procedure

This document records what has actually been observed on a real machine, and the
procedure to reproduce it. Do not copy a result into `docs/EVALUATION.md` unless
it was observed here.

## Observed status (2026-11-23, this repository)

### Cloud: WORKING (real SDK call, `IN_CLOUD`)

Run in headless Chrome 141 against the live project, smart-hybrid mode with
cloud consent granted, `VITE_AI_CLOUD_MODEL=gemini-3.5-flash-lite`,
`firebase` 13.4.0, App Check debug provider with limited-use tokens:

- 33 attempts over 11 authored documents (3 runs each), paced 9.5 s.
- 27 successes, all reporting `IN_CLOUD`; 6 provider HTTP 500s (“high demand”).
- Inference latency p50 2791 ms, p95 8860 ms (n=27).
- Deadlines verified 15/24, costs 25/35 — the unverified ones are the Amharic,
  ambiguous-date, Ethiopian-calendar and OCR-damaged cases, by design.

Full per-document table, caveats and failure cases are in
`docs/EVALUATION.md`; the raw JSON artifact is
`docs/eval-live-results-2026-11-23.json`. On-device is still unavailable on this
hardware, so every sample above is cloud.

**Root cause of the earlier `401` and the fix.** Two separate causes stacked:

1. The browser's debug token was not registered for the project. Registering it
   made `exchangeDebugToken` return a real JWT (`"provider":"debug"`), yet AI
   Logic still answered `401 Firebase App Check token is invalid`.
2. The project has **App Check replay protection** enabled for Firebase AI
   Logic. With replay protection on, App Check tokens are single-use, so AI
   Logic rejects a standard (reusable) token — even a fresh, correctly scoped
   one. The client must request limited-use tokens:

   ```ts
   getAI(app, { backend: new GoogleAIBackend(), useLimitedUseAppCheckTokens: true });
   ```

   This is set in `frontend/src/lib/hybrid/ai.ts`. It only applies on the first
   `getAI()` call for an app, so it cannot be toggled later at runtime.

Diagnostics that isolated it (all reproducible with `curl`, no SDK involved):

| Probe | Result |
|---|---|
| `exchangeDebugToken` with a random UUID | `403 App attestation failed` → registration is real |
| `exchangeDebugToken` with the app's token | `200`, JWT with `provider=debug`, `aud` = project |
| `generateContent` with none of the header | `401 Firebase App Check token is invalid` (same message) |
| `generateContent` with the standard JWT | `401` → replay protection mismatch |
| App with `useLimitedUseAppCheckTokens: true` | `200` → `IN_CLOUD` |

The identical message for a missing and an unusable token makes this error
unhelpful on its own: check the exchange result and the replay-protection
setting before assuming the token is unregistered.

### On-device: not run

`LanguageModel.availability()` returned `unavailable`; this test browser has no
Prompt API model. Needs desktop Chrome 139+ with the model available.

### Next action

Repeat §1 and §2 below on a machine that supports on-device inference, and
re-run the eval to record more cloud samples with denominators.

### If you see `401 … App Check token is invalid`

1. Open DevTools → Console and find the line
   `Firebase App Check debug token: <uuid>`.
   The Hybrid AI Lab now shows the same token with a Copy button and the exact
   console link whenever an App Check failure is reported.
2. Register it: Firebase Console → App Check → Apps → *Manage debug tokens* →
   Add. This is console-only: **firebase-tools no longer ships the App Check
   commands** (verified on 15.2.1 — `firebase appcheck:debugtokens:create`
   returns “not a Firebase command”), so no CLI equivalent is documented here.
   The REST API `projects/{project}/apps/{appId}/debugTokens` works with
   `gcloud auth print-access-token` plus an `x-goog-user-project` header, but
   only for an account with permission on the project.
3. Reload and run the eval again. Expect `IN_CLOUD` rows with real latencies.

A CSP warning such as `[Report Only] Refused to load … recaptcha__en.js` is a
report-only policy, usually injected by a browser extension; it does not block
App Check and is not the cause of a 401. Only a registered token or a production
site key for the deployed origin will clear the rejection.

## 0. What must be true before you start

| Requirement | How to check |
|---|---|
| Firebase project with AI Logic enabled | Firebase console → AI Logic |
| Web app registered, App Check configured | Firebase console → App Check |
| Firebase web config in `frontend/.env.local` | `npm run check:hybrid` |
| Desktop Chrome 139+ with the Prompt API model | `/hybrid-lab` → Device capability |

`npm run check:hybrid` prints which required keys are missing **without
printing their values**. It exits non-zero until `VITE_FIREBASE_API_KEY`,
`VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_APP_ID` are present.

App Check:

- Local testing: `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=true`, then register the
  printed debug token in the Firebase console.
- Deployed origin: `VITE_FIREBASE_APPCHECK_SITE_KEY=<reCAPTCHA Enterprise key>`
  and add the production hostname to App Check.

Never commit `frontend/.env.local`. `npm run check:secrets` must stay green.

## 1. Cloud path (Gate B)

1. `npm run dev`, open `http://localhost:5173/hybrid-lab`.
2. Confirm **Firebase configured: Yes** and **SDK ready: Yes**.
3. In Privacy Center, switch to **Cloud for complex documents** and grant
   consent (or use Smart hybrid with consent).
4. Run **Run hybrid eval**. Every row must finish with a `Source` value.
5. Open DevTools → Network and confirm the request goes to
   `firebasevertexai.googleapis.com` / AI Logic, not a direct Gemini REST call.
6. Record: date, browser version, `VITE_AI_CLOUD_MODEL`, per-row source,
   latency, schema validity, verified-field counts, and any error codes.

A cloud row is evidence of a real call. A local fallback row is not.

## 2. On-device path (Gate C, online)

1. Desktop Chrome 139+, supported hardware, Prompt API available.
2. `npm run dev`, open `/hybrid-lab`.
3. Confirm **On-device model: Available** (or press *Download on-device model*
   on Home and wait for the SDK progress to finish).
4. Press **Run on-device test** (Hybrid AI Lab → On-device test).
   This runs with SDK mode `ONLY_ON_DEVICE`, so there is no cloud fallback.
5. Pass condition: the panel reads **“Ran on this device”** — i.e.
   `response.inferenceSource === "ON_DEVICE"`.
6. If it reports cloud execution or an error, that is **not** a pass. Record the
   reported availability and the browser console error.

## 3. Offline local inference (Gate C, offline)

1. Complete §2 first so the model is downloaded and cached.
2. DevTools → Network → **Offline**.
3. Press **Run on-device test** again.
4. Pass condition: a *new* result with source `ON_DEVICE` while offline.
5. A bundled demo example, a cached explanation, or a shell that merely loads
   offline is **not** evidence of generative local inference.

Also verify strict privacy mode:

1. Privacy mode → **Private device only**.
2. Run a document. With DevTools Network open, confirm **no** document-bearing
   request leaves the page.
3. On a browser without the local model, the request must fail visibly — never
   silently upload.

## 4. Results to record (fill in only with observed values)

| Check | Environment | Result | Evidence |
|---|---|---|---|
| Cloud generateContent through AI Logic | | | |
| On-device generateContent (`ON_DEVICE`) | | | |
| Offline on-device after download | | | |
| Strict private mode, no cloud request | | | |
| Consent refused → request blocked | | | |

Record the same rows in `docs/EVALUATION.md` under the hybrid section, and keep
the historical Adaption numbers separate.

## 5. When something fails

| Symptom | Likely cause | Next step |
|---|---|---|
| `Firebase not configured` in `/hybrid-lab` | missing `VITE_FIREBASE_*` | `npm run check:hybrid` |
| Source is always `IN_CLOUD` | no local model, or mode is cloud | check Device capability; use Chrome 139+ desktop |
| `APP_CHECK_FAILED` | debug token not registered, or origin not allowed | register token / add hostname |
| On-device test returns no result | model not prepared, or Prompt API flag missing | download model, retry from a click |
| Offline test fails after an online pass | model not cached | rerun §2 online until the download completes |

## 6. Honest reporting

- Keep the words “not run” for anything you did not execute.
- Never present a requested mode as the execution source; only
  `response.inferenceSource` decides.
- Do not claim mobile on-device support: web on-device inference is a desktop
  Chrome feature, and a phone-sized viewport is not evidence.
