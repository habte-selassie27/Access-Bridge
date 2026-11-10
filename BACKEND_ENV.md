# Backend environment variables (Railway)

These are the variables the backend needs or may use.

## Required to start
None. The backend starts without provider keys and runs in a degraded mode.

## Provider keys
- `GROQ_API_KEY`
  - Used by the LLM path for explanations, follow-ups, and translation.
  - Primary key for live processing.
- `GEMINI_API_KEY`
  - Used for Gemini TTS and OCR.
  - If set, Gemini TTS is used automatically for languages the device does not have.
- `ADAPTION_API_KEY`
  - Used by the Adaption integration.
  - Needed for dataset and evaluation features.
- `ANTHROPIC_API_KEY`
  - Used if the Anthropic path is enabled.

## Backend host
- `NODE_ENV`
  - Set to `production` on Railway.
- `PORT`
  - Optional. Railway may set this.
  - The backend listens only when run as a standalone server.

## CORS
- `CORS_ORIGINS`
  - Comma-separated list of allowed origins.
  - Required when the frontend and backend are on different hosts.
  - Example for split deployment:
    - `CORS_ORIGINS=https://your-app.vercel.app`

If `CORS_ORIGINS` is empty, the backend accepts requests with no origin or from any origin in development-like behavior. In production with a split frontend, set it explicitly.

## TTS
- `TTS_PROVIDER`
  - Optional.
  - Examples: `local`, `gemini`, `openai`.
- `TTS_PROVIDER_KEY`
  - Optional.
  - Used for hosted TTS providers that need a dedicated TTS key.
- `TTS_BASE_URL`
  - Optional.
  - Base URL for a local OpenAI-compatible TTS endpoint.
- `TTS_MODEL`
  - Optional.
- `TTS_VOICE_ID`
  - Optional.

If `GEMINI_API_KEY` is set and no other TTS provider is configured, the backend uses Gemini TTS automatically.

## LLM model selection
- `GROQ_MODEL`
  - Optional.
  - Default is `openai/gpt-oss-120b`.
  - On tight quota, use `openai/gpt-oss-20b`.

## Adaption
- `ADAPTION_API_KEY`
- `ADAPTION_BASE_URL`
  - Optional.
  - Default: `https://api.prod.adaptionlabs.ai`

## Rate limiting and spend
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
  - Optional.
  - Enable distributed rate limiting.
  - Without them, the backend falls back to in-memory limits.
- `DAILY_SPEND_CAP_USD`
  - Optional.
  - Default: `5`.

## Auth
- `AUTH_STORE_PATH`
  - Optional.
  - Path for the account/session JSON file.
  - On Railway and other ephemeral filesystems, set this to persistent storage.
- `AUTH_SESSION_DAYS`
  - Optional.
  - Default: `30`.
- `COOKIE_SAMESITE`
  - Optional.
  - Use `none` when the frontend and backend are on different hosts and cookies are Secure.

## Demo mode
The backend runs in demo mode when no provider keys are configured. Demo mode still serves the app locally, but live processing is unavailable.

## Full example for Railway
```
NODE_ENV=production
CORS_ORIGINS=https://your-app.vercel.app
GROQ_API_KEY=...
GEMINI_API_KEY=...
ADAPTION_API_KEY=...
ADAPTION_BASE_URL=https://api.prod.adaptionlabs.ai
GROQ_MODEL=openai/gpt-oss-20b
DAILY_SPEND_CAP_USD=5
TTS_PROVIDER_KEY=
TTS_PROVIDER=
TTS_BASE_URL=
TTS_MODEL=
TTS_VOICE_ID=
AUTH_STORE_PATH=/persistent/data/auth/users.json
AUTH_SESSION_DAYS=30
COOKIE_SAMESITE=none
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```
