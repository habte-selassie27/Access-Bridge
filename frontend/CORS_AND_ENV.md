# CORS and deploy layout

This app can be deployed in two layouts.

## 1. Frontend and backend on the same host
Example: a single Express app serving the built frontend and the API.
- No CORS needed for API calls.
- No VITE_API_BASE needed.
- The frontend can use relative `/api` paths.

## 2. Frontend on Vercel, backend on Railway
Example: this repo's current recommended layout.
- The frontend is a static site on Vercel, built from `frontend/`.
- The backend is a long-running Express server on Railway.
- The frontend calls the backend over the network.
- Set `VITE_API_BASE` in the Vercel project to the Railway public URL, without a trailing slash.
- On the Railway backend, set `CORS_ORIGINS` to the Vercel frontend origin.
- Auth cookies, if used, require `credentials: true` and the correct origin in CORS.

### Example production values
Frontend (Vercel env):
- `VITE_API_BASE=https://your-railway-project.up.railway.app`

Backend (Railway env):
- `CORS_ORIGINS=https://your-vercel-frontend.vercel.app`
- `NODE_ENV=production`
- `PORT` as assigned by Railway, or leave it to the platform default
- Provider keys: `GROQ_API_KEY`, `GEMINI_API_KEY`, `ADAPTION_API_KEY`
- `DAILY_SPEND_CAP_USD`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` if you want distributed rate limiting

### Why not proxy `/api` from Vercel to Railway
Vercel serverless rewrites are for Vercel functions, not external hosts. If the backend lives on Railway, the frontend should call it directly with CORS, not try to proxy through Vercel.

## Local development
- Backend runs locally on port 3001.
- Frontend dev server proxies `/api` to `http://localhost:3001` by default.
- If you run the backend elsewhere locally, set `VITE_API_BASE` in a `.env.local` inside `frontend/`.
