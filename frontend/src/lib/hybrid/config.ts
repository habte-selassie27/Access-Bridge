/**
 * Firebase AI Logic hybrid-inference configuration.
 *
 * Everything here is driven by Vite env vars so the same build works for any
 * Firebase project without a recompile. Web config (apiKey, projectId, ...)
 * is public by design; it is protected by Firebase App Check, not by secrecy.
 *
 * Set these in `.env.local` (gitignored) and in the Vercel project:
 *
 *   VITE_FIREBASE_API_KEY=...
 *   VITE_FIREBASE_AUTH_DOMAIN=...
 *   VITE_FIREBASE_PROJECT_ID=...
 *   VITE_FIREBASE_STORAGE_BUCKET=...
 *   VITE_FIREBASE_MESSAGING_SENDER_ID=...
 *   VITE_FIREBASE_APP_ID=...
 *   VITE_FIREBASE_MEASUREMENT_ID=...   (optional)
 *
 * App Check:
 *   VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=true   (local dev only — prints a token)
 *
 * Inference:
 *   VITE_AI_INFERENCE_MODE=prefer_on_device  (prefer_on_device | only_on_device |
 *                                             prefer_in_cloud | only_in_cloud)
 *   VITE_AI_CLOUD_MODEL=gemini-3.5-flash-lite
 */

export type InferenceModeName =
  | "prefer_on_device"
  | "only_on_device"
  | "prefer_in_cloud"
  | "only_in_cloud";

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

function env(name: string): string {
  const v = (import.meta as any).env?.[name];
  return typeof v === "string" ? v : "";
}

export const firebaseConfig: FirebaseConfig | null = (() => {
  const c: FirebaseConfig = {
    apiKey: env("VITE_FIREBASE_API_KEY"),
    authDomain: env("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: env("VITE_FIREBASE_PROJECT_ID"),
    storageBucket: env("VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: env("VITE_FIREBASE_MESSAGING_SENDER_ID"),
    appId: env("VITE_FIREBASE_APP_ID"),
    measurementId: env("VITE_FIREBASE_MEASUREMENT_ID") || undefined,
  };
  if (!c.apiKey || !c.projectId || !c.appId) return null;
  return c;
})();

export const appCheckDebugToken: string | boolean = (() => {
  const v = env("VITE_FIREBASE_APPCHECK_DEBUG_TOKEN");
  if (v === "true") return true;
  return v || false;
})();

export const inferenceModeName: InferenceModeName =
  (env("VITE_AI_INFERENCE_MODE") as InferenceModeName) || "prefer_on_device";

export const cloudModelName: string =
  env("VITE_AI_CLOUD_MODEL") || "gemini-3.5-flash-lite";

export function isHybridConfigured(): boolean {
  return firebaseConfig !== null;
}