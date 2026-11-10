# API contract (frontend)

The frontend calls the same routes in both development and production.

Development:
- The dev server proxies `/api` to the local backend.
- The backend runs on port 3001 from the repository root.

Production:
- The frontend and backend may be on different hosts.
- Set `VITE_API_BASE` to the production backend origin when they are separated.
- If `VITE_API_BASE` is empty, the app still builds; runtime API calls then depend on the hosting layout. For a split deployment, always set it, and allow the backend origin in CORS.

Client-side API base:
- `import.meta.env.VITE_API_BASE`
- Used by `frontend/src/lib/api/client.ts` and a few screens directly for `/api/tts`.

Backend routes used by the frontend:
- `POST /api/explain`
- `POST /api/followup`
- `POST /api/tts`
- `POST /api/translate`
- `POST /api/import`
- `POST /api/eligibility`
- `POST /api/compare`
- `POST /api/simplify`
- `POST /api/ask`
- `GET /api/health`
- `GET /api/eval`
- Auth routes under `/api/auth`

Notes:
- The frontend prefers `/api/explain`, `/api/followup`, and `/api/tts`.
- Voice Studio uses `/api/tts` and `/api/translate`.
- When the backend is on Railway and the UI is on Vercel, the backend origin must be listed in `CORS_ORIGINS` on the backend.
