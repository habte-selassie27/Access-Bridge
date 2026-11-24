# Test matrix — AccessBridge Hybrid

## Browser/device matrix (to be executed and recorded with actual results)

| Environment | On-device available? | Cloud works? | Strict private mode | Notes |
|---|---|---|---|---|
| Chrome 139+ desktop (supported HW) | TBD | TBD | TBD | Primary demo target |
| Chrome <139 desktop | No | TBD | N/A (fails visibly) | Cloud path only |
| Firefox desktop | No | TBD | N/A | Cloud path only |
| Safari desktop | No | TBD | N/A | Cloud path only |
| Chrome mobile | No (web on-device not supported) | TBD | N/A | Cloud path only; do not claim on-device |
| Offline (model downloaded) | TBD | No | TBD | Live inference only |

## Test scenarios
- Short English notice, Amharic notice
- Date ambiguity, multiple fees, Ethiopian calendar
- Malformed OCR, missing deadlines
- Prompt injection (instruction override, fake system messages, hidden unicode)
- Long PDF (chunking + truncation warning)
- Offline, unsupported browser, no model installed
- Cloud quota error, App Check error
- Strict private mode network leakage (intercept)
- Consent revoke mid-flow

## Repro
- `npm run check:hybrid` — confirms the Vite Firebase config is present (no values printed).
- `npm run dev` then follow README Firebase setup.
- Run `npm test` and `npm run smoke`.
- Follow `docs/LIVE_INFERENCE.md` for the cloud, on-device and offline checks, then
  record actual device/SDK versions and outcomes in EVALUATION.md. Unrun rows stay "not run".
```