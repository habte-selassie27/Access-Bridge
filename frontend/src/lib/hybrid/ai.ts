/**
 * Firebase AI Logic hybrid inference — web (Chrome).
 *
 * On-device Gemini Nano via Chrome's Prompt API when available, with a
 * seamless cloud fallback (Gemini Developer API through Firebase). The LLM
 * proposes; the deterministic verifier in `frontend/src/lib/verify.ts` still
 * decides whether a date or amount may be shown as verified.
 *
 * Usage:
 *   await initHybrid();                       // once, after user interaction
 *   const r = await hybridGenerate({ ... });  // structured or text
 *   r.source // "ON_DEVICE" | "IN_CLOUD"
 */
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  Schema,
  type AI,
  type GenerativeModel,
} from "firebase/ai";

import {
  firebaseConfig,
  appCheckDebugToken,
  inferenceModeName,
  cloudModelName,
  isHybridConfigured,
  type InferenceModeName,
} from "./config.ts";
import { remoteCloudModel, remoteInferenceMode, initRemoteConfig } from "./remoteConfig.ts";
import { sdkModeToInferenceModeName } from "../privacy/modes.ts";

export type InferenceSource = "ON_DEVICE" | "IN_CLOUD";

export interface HybridResult {
  text: string;
  source: InferenceSource;
  latencyMs: number;
}

let app: FirebaseApp | null = null;
let ai: AI | null = null;
let deviceModelInitialized = false;

export type HybridErrorCode = "APP_CHECK_FAILED" | "RATE_LIMITED" | "PROVIDER_ERROR" | "SCHEMA_INVALID";
let lastHybridError: { code: HybridErrorCode; message: string } | null = null;

/** The most recent hybrid failure, for typed, user-visible errors. */
export function getLastHybridError(): { code: HybridErrorCode; message: string } | null {
  return lastHybridError;
}

function setHybridError(error: unknown): void {
  const raw = error as { message?: string; code?: string };
  const text = `${raw?.code ?? ""} ${raw?.message ?? String(error)}`;
  if (/app.?check/i.test(text)) {
    lastHybridError = {
      code: "APP_CHECK_FAILED",
      message:
        "Firebase App Check rejected this request. Register this origin or its debug token in the Firebase console, then retry.",
    };
    return;
  }
  if (/permission_denied|permission|\b403\b/i.test(text)) {
    lastHybridError = {
      code: "APP_CHECK_FAILED",
      message: "Firebase denied this request. Check App Check attestation and AI Logic permissions.",
    };
    return;
  }
  if (/quota|\b429\b|resource_exhausted/i.test(text)) {
    lastHybridError = {
      code: "RATE_LIMITED",
      message: "The model is rate-limited right now. Wait a moment and try again.",
    };
    return;
  }
  lastHybridError = {
    code: "PROVIDER_ERROR",
    message: (raw?.message ?? String(error)).slice(0, 300),
  };
}

function clearHybridError(): void {
  lastHybridError = null;
}

/**
 * Telemetry-safe error log (AGENTS.md §13): Firebase SDK errors can include
 * request details in customData. Log only the classified code, never the raw
 * error object or any prompt/document text.
 */
function logHybridError(scope: string, error: unknown): void {
  const code = (error as { code?: string })?.code?.slice(0, 80) ?? "unknown";
  console.error(`[hybrid] ${scope} failed (${code})`);
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!app && isHybridConfigured()) initHybrid();
  return app;
}

function modeFromName(name: string): InferenceMode {
  switch (name) {
    case "only_on_device":
      return InferenceMode.ONLY_ON_DEVICE;
    case "prefer_in_cloud":
      return InferenceMode.PREFER_IN_CLOUD;
    case "only_in_cloud":
      return InferenceMode.ONLY_IN_CLOUD;
    case "prefer_on_device":
    default:
      return InferenceMode.PREFER_ON_DEVICE;
  }
}

/** Initialize Firebase + App Check. Safe to call repeatedly. */
export function initHybrid(): boolean {
  if (!isHybridConfigured() || !firebaseConfig) return false;
  if (app) return true;
  try {
    app = initializeApp(firebaseConfig);
    // App Check: required by Firebase AI Logic. In local dev we enable the
    // debug provider (prints a token to the console to safelist). In
    // production we use reCAPTCHA Enterprise with a site key from env.
    const siteKey = (import.meta as any).env?.VITE_FIREBASE_APPCHECK_SITE_KEY || "";
    if (appCheckDebugToken) {
      if (typeof appCheckDebugToken === "boolean") {
        (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      } else {
        (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugToken;
      }
    }
    try {
      if (siteKey) {
        initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(siteKey),
          isTokenAutoRefreshEnabled: true,
        });
      } else {
        // No site key: still call initializeAppCheck so the integration is
        // present; reviewers follow the README to add a key / debug token.
        if (!appCheckDebugToken) {
          console.warn(
            "[hybrid] App Check has neither a site key nor a debug token; Firebase AI Logic cloud calls will be rejected."
          );
        }
        initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(""),
          isTokenAutoRefreshEnabled: true,
        });
      }
    } catch (e) {
      logHybridError("AppCheckInit", e);
    }
    // App Check replay protection (enabled for AI Logic) makes tokens
    // single-use; AI Logic rejects standard tokens once it is on, so request
    // limited-use tokens. This only takes effect on the first getAI() call.
    ai = getAI(app, {
      backend: new GoogleAIBackend(),
      useLimitedUseAppCheckTokens: true,
    });
    return true;
  } catch (e) {
    logHybridError("init", e);
    app = null;
    ai = null;
    return false;
  }
}

export function getHybridAI(): AI | null {
  if (!ai && isHybridConfigured()) initHybrid();
  return ai;
}

export function isHybridReady(): boolean {
  return getHybridAI() !== null;
}

/** Check whether the on-device model is available in this browser. */
export async function getDeviceModelAvailability(): Promise<"available" | "downloadable" | "downloading" | "unavailable"> {
  try {
    const lm = (globalThis as any).LanguageModel;
    if (!lm || typeof lm.availability !== "function") return "unavailable";
    const status = await lm.availability();
    if (status === "available") return "available";
    if (status === "downloading") return "downloading";
    if (status === "downloadable") return "downloadable";
    return "unavailable";
  } catch {
    return "unavailable";
  }
}

/**
 * Create a GenerativeModel configured for hybrid inference with optional
 * structured output (JSON schema). Pass `schema` (Firebase Schema helper
 * object) to force JSON output on both on-device and cloud.
 */
export function getHybridModel(opts: {
  systemInstruction?: string;
  schema?: any;
  mode?: InferenceModeName;
} = {}): GenerativeModel | null {
  const a = getHybridAI();
  if (!a) return null;
  // Kick off Remote Config fetch (non-blocking); uses cached values if ready.
  void initRemoteConfig();
  const resolvedMode = opts.mode ?? (remoteInferenceMode() as InferenceModeName) ?? inferenceModeName;
  const resolvedCloudModel = remoteCloudModel() || cloudModelName;
  const mode = modeFromName(resolvedMode);
  const inCloudParams: Record<string, any> = {
    model: resolvedCloudModel,
  };
  if (opts.schema) {
    inCloudParams.generationConfig = {
      responseMimeType: "application/json",
      responseSchema: opts.schema,
    };
  }
  if (opts.systemInstruction) {
    inCloudParams.systemInstruction = opts.systemInstruction;
  }
  const onDeviceParams: Record<string, any> = {};
  if (opts.schema) {
    onDeviceParams.promptOptions = { responseConstraint: opts.schema };
  }
  if (opts.systemInstruction) {
    onDeviceParams.createOptions = {
      initialPrompts: [{ role: "system", content: [{ type: "text", value: opts.systemInstruction }] }],
    };
  }
  try {
    return getGenerativeModel(a, {
      mode,
      inCloudParams,
      onDeviceParams,
    } as any);
  } catch (e) {
    logHybridError("getGenerativeModel", e);
    return null;
  }
}

/**
 * Initialize the on-device model. Must be called after a user interaction
 * (button click) and before sending prompts. Starts the model download in
 * the background if needed.
 */
export async function initializeDeviceModel(
  model: GenerativeModel,
  onProgress?: (pct: number) => void
): Promise<void> {
  if (deviceModelInitialized) return;
  try {
    (model as any).initializeDeviceModel?.((val: number) => {
      if (onProgress) onProgress(Math.round(val * 10000) / 100);
    });
    deviceModelInitialized = true;
  } catch (e) {
    logHybridError("initializeDeviceModel", e);
  }
}

/** Single-turn text generation with hybrid inference. */
export async function hybridGenerateText(opts: {
  prompt: string;
  systemInstruction?: string;
  onProgress?: (pct: number) => void;
  /** SDK mode override driven by the privacy mode. */
  sdkMode?: "ONLY_ON_DEVICE" | "PREFER_ON_DEVICE" | "ONLY_IN_CLOUD" | "PREFER_IN_CLOUD";
}): Promise<HybridResult | null> {
  const modeName = opts.sdkMode
    ? sdkModeToInferenceModeName(opts.sdkMode)
    : undefined;
  const model = getHybridModel({ systemInstruction: opts.systemInstruction, mode: modeName });
  if (!model) {
    lastHybridError = {
      code: "PROVIDER_ERROR",
      message: "Firebase AI Logic is not ready. Check that the VITE_FIREBASE_* configuration and App Check are set up.",
    };
    return null;
  }
  await initializeDeviceModel(model, opts.onProgress);
  const t0 = performance.now();
  try {
    const result = await (model as any).generateContent(opts.prompt);
    const response = result?.response;
    const text = typeof response?.text === "function" ? response.text() : String(response?.text ?? "");
    const source: InferenceSource =
      response?.inferenceSource === "ON_DEVICE" ? "ON_DEVICE" : "IN_CLOUD";
    clearHybridError();
    return { text, source, latencyMs: Math.round(performance.now() - t0) };
  } catch (e) {
    logHybridError("generateText", e);
    setHybridError(e);
    return null;
  }
}

/** Structured (JSON) generation with hybrid inference. */
export async function hybridGenerateStructured<T = any>(opts: {
  prompt: string;
  systemInstruction?: string;
  schema: any;
  onProgress?: (pct: number) => void;
  sdkMode?: "ONLY_ON_DEVICE" | "PREFER_ON_DEVICE" | "ONLY_IN_CLOUD" | "PREFER_IN_CLOUD";
}): Promise<{ data: T; source: InferenceSource; latencyMs: number } | null> {
  const modeName = opts.sdkMode
    ? sdkModeToInferenceModeName(opts.sdkMode)
    : undefined;
  const model = getHybridModel({ systemInstruction: opts.systemInstruction, schema: opts.schema, mode: modeName });
  if (!model) {
    lastHybridError = {
      code: "PROVIDER_ERROR",
      message: "Firebase AI Logic is not ready. Check that the VITE_FIREBASE_* configuration and App Check are set up.",
    };
    return null;
  }
  await initializeDeviceModel(model, opts.onProgress);
  const t0 = performance.now();
  try {
    const result = await (model as any).generateContent(opts.prompt);
    const response = result?.response;
    const text = typeof response?.text === "function" ? response.text() : String(response?.text ?? "");
    const source: InferenceSource =
      response?.inferenceSource === "ON_DEVICE" ? "ON_DEVICE" : "IN_CLOUD";
    let data: T;
    try {
      data = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
    } catch {
      lastHybridError = {
        code: "SCHEMA_INVALID",
        message: "The model returned a response that was not valid JSON. Try again or use a shorter excerpt.",
      };
      return null;
    }
    clearHybridError();
    return { data, source, latencyMs: Math.round(performance.now() - t0) };
  } catch (e) {
    logHybridError("generateStructured", e);
    setHybridError(e);
    return null;
  }
}

// Re-export Schema for callers building schemas.
export { Schema, InferenceMode };