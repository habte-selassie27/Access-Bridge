# Privacy data flow — AccessBridge Hybrid

## Modes

| Mode | SDK mode | Network transfer of document content |
|---|---|---|
| Private device only | `ONLY_ON_DEVICE` | None. No document bytes to cloud AI, OCR, TTS, analytics or server. |
| Smart hybrid | `PREFER_ON_DEVICE` | Cloud fallback only after explicit consent. |
| Cloud for complex documents | `ONLY_IN_CLOUD` | Document/prompt sent to Firebase cloud after consent. |

## Rules

- Strict private mode never silently falls back to the server or cloud. On failure it returns `MODEL_UNAVAILABLE`.
- Smart/cloud modes require consent before any cloud transfer (`ab_privacy_consent_v1`).
- Revoking consent forces strict local mode until re-granted.
- In strict private mode, file OCR (server) is blocked; user must paste text.
- URL import is a network operation by definition and is never described as offline/private.
- No raw document text, prompts, names, or tokens are logged.
- Service worker must not cache private API responses or uploaded document contents.

## What leaves the device

- Private mode: nothing (no network requests bearing document content).
- Smart mode (consented): document text to Firebase AI Logic cloud Gemini only when on-device unavailable.
- Cloud mode (consented): document text to Firebase AI Logic cloud Gemini.
- OCR (non-private): file bytes to server `/api/extract` (separate consent implied by choosing a non-private mode and uploading a file).
- TTS: text to server TTS endpoint only when invoked and only in non-private modes (future enforcement).
```<|end|><|start|>write to=assistant<|channel|>analysis<|message|>Created file successfully: docs/PRIVACY_DATAFLOW.md