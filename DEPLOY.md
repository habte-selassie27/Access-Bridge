# Deployment layout

This app is split into two deployments:

- Frontend on Vercel
- Backend on Railway

## Frontend (Vercel)

Build from `frontend/`. In Vercel, set **Root Directory = `frontend`**.

- Root directory: `frontend`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

Details:
- `frontend/vercel.json` controls the Vercel frontend build. There is no `vercel.json` at the repo root.
- It does **not** serve the backend. `/api/*` is not rewritten there, so an unset
  `VITE_API_BASE` produces `404` responses rather than a working API.
- The frontend is a static Vite app; `VITE_API_BASE` is inlined at build time.

Production env for the frontend:
- `VITE_API_BASE` = the public Railway backend URL, no trailing slash
- Example: `VITE_API_BASE=https://your-project.up.railway.app`
- **Redeploy after changing it.** Vite bakes the value into the bundle, so saving the
  variable alone does not update the already-built site.

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
- `GROQ_API_KEY` primary live LLM
- `MISTRAL_API_KEY` fallback live LLM, used when Groq is absent
- `GEMINI_API_KEY` OCR for photos/PDFs
- `ADAPTION_API_KEY`
- `ADAPTION_BASE_URL=https://api.prod.adaptionlabs.ai`
- `DAILY_SPEND_CAP_USD`
- `GROQ_MODEL` optional; default is `openai/gpt-oss-120b`
- `MISTRAL_MODEL` optional; default is `mistral-large-latest`
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
- The active LLM is chosen at boot time by availability: Groq first, then Mistral,
  then demo if neither is configured. Gemini stays reserved for OCR and TTS, not
  general chat.

## Active LLM order

1. `GROQ_API_KEY` present -> Groq is the live LLM.
2. `GROQ_API_KEY` absent and `MISTRAL_API_KEY` present -> Mistral is the live LLM.
3. Neither present -> demo mode only.

Set `MISTRAL_API_KEY` when you want Mistral to be the active provider after Groq.
Do not paste the real key into committed files; keep it in the backend env only.

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
