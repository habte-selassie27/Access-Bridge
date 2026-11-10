# Deployment layout

This app is split into two deployments:

- Frontend on Vercel
- Backend on Railway

## Frontend (Vercel)

Build from `frontend/`.

- Repo root: `frontend/`
- Build command: `cd frontend && npm install && npm run build`
- Output directory: `frontend/dist`
- Install command: `cd frontend && npm install`

Details:
- `vercel.json` at the repo root controls the Vercel frontend build.
- It does **not** serve the backend.
- The frontend is a static Vite app.

Production env for the frontend:
- `VITE_API_BASE` = the public Railway backend URL, no trailing slash
- Example: `VITE_API_BASE=https://your-project.up.railway.app`

Local development:
- The frontend dev server proxies `/api` to `http://localhost:3001` by default.
- If your local backend runs elsewhere, set `VITE_API_BASE` in `frontend/.env.local`.

## Backend (Railway)

Run the Express server from `server/index.ts`.

- Start command: `npx tsx server/index.ts`
- Or if you prefer a built artifact: generate `api/index.js` and start `node api/index.js`

Railway env vars:
- `NODE_ENV=production`
- `PORT` optional; Railway sets the port if needed
- `CORS_ORIGINS` = the Vercel frontend origin
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `ADAPTION_API_KEY`
- `ADAPTION_BASE_URL=https://api.prod.adaptionlabs.ai`
- `DAILY_SPEND_CAP_USD`
- `GROQ_MODEL` optional; default is `openai/gpt-oss-120b`
- `TTS_PROVIDER_KEY` optional
- `TTS_PROVIDER` optional
- `TTS_BASE_URL` optional
- `TTS_MODEL` optional
- `TTS_VOICE_ID` optional
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` optional
- `AUTH_STORE_PATH` optional; needed for persistent accounts on Railway
- `AUTH_SESSION_DAYS` optional; default 30
- `COOKIE_SAMESITE` optional; use `none` when frontend and backend are on different hosts

Notes:
- Railway provides a public URL like `https://<project>.up.railway.app`.
- The backend listens only when run as a standalone server, not inside a Vercel serverless function.
- The backend already reads `CORS_ORIGINS` and rejects other origins by default.

## Why split this way

Frontend:
- Static Vite site, easy on Vercel.
- No server process needed for the UI.

Backend:
- Long-running Express server.
- TTS, OCR, LLM calls, rate limits, and auth state are easier as a persistent service.
- Vercel serverless functions are not a good fit for a full server process.

## CORS

When frontend and backend are on different hosts:
- Backend must allow the frontend origin in `CORS_ORIGINS`.
- Frontend must point to the backend with `VITE_API_BASE`.
- Auth cookies require `credentials: true` on the frontend and the correct origin in CORS.

## Same-host alternative

If you want everything on Vercel as a serverless function instead:
- Keep `api/index.js` in the repo.
- Set Vercel build to also produce the serverless function.
- Do not use Railway for the backend in that layout.

This repo currently prefers the split layout.
