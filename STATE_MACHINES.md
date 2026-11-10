# State machines in Access-Bridge

This document inventories the implicit state machines that used to live as scattered
`useState` booleans and the explicit machines that replaced them.

## Migrated to explicit machines (`frontend/src/lib/state`)

| Implicit machine (before) | Location | Explicit machine | States |
|---|---|---|---|
| Document processing | `screens/Home.tsx` | `documentReducer` | idle, validating, processing, success, error |
| Audio playback | `components/audio/ListenButton.tsx` | `audioReducer` | idle, loading, playing, paused, error |
| Follow-up chat | `components/followup/FollowUpSheet.tsx` | `followupReducer` | idle, sending, success, error |
| Evaluation view | `screens/Eval.tsx` | `evalReducer` | loading, ready, error + view tab |
| Camera capture | `components/input/CameraCapture.tsx` | `cameraReducer` | idle, requesting, streaming, captured, error |

## Identified but intentionally left implicit (low risk / out of scope)

- `App.tsx` page + result routing: URL-driven; introducing a machine would couple to history API without UX gain.
- `PasteBox.tsx` input mode (text/file/demo): derived from three values; kept as-is to preserve paste/upload UX.
- `DocumentsCard` / `ActionChecklist` local "done" sets: pure UI toggles, no transitions.
- `OriginalDocumentViewer` expanded/activeQuote: presentational toggle.
- Backend `explain` route processing: sequential await chain; failures already return clean errors. A machine would add indirection without changing outcomes.

## Rules
- New async flows must use `useMachine` + a reducer in `frontend/src/lib/state`.
- Reducers are pure and unit-tested (`frontend/src/lib/state.test.ts`).
- UI derives flags (`processing`, `error`) from `state.status`, never from separate booleans.
