/**
 * Firebase Remote Config — optional, encouraged by the hackathon.
 *
 * Used to tune the hybrid AI at runtime (cloud model name, inference mode)
 * without shipping a new build. Falls back to env defaults when Remote Config
 * is unavailable or not configured.
 */
import { getRemoteConfig, fetchAndActivate, getValue, type RemoteConfig } from "firebase/remote-config";
import { firebaseConfig, isHybridConfigured } from "./config.ts";
import { getApp } from "firebase/app";

let rc: RemoteConfig | null = null;
let activated = false;

function env(name: string): string {
  const v = (import.meta as any).env?.[name];
  return typeof v === "string" ? v : "";
}

export async function initRemoteConfig(): Promise<void> {
  if (!isHybridConfigured() || !firebaseConfig) return;
  if (rc) return;
  try {
    let app: any;
    try {
      app = getApp();
    } catch {
      // Firebase app not initialized yet; initHybrid first.
      return;
    }
    if (!app) return;
    rc = getRemoteConfig(app);
    rc.settings.minimumFetchIntervalMillis = 60_000;
    rc.defaultConfig = {
      cloud_model: env("VITE_AI_CLOUD_MODEL") || "gemini-3.5-flash-lite",
      inference_mode: env("VITE_AI_INFERENCE_MODE") || "prefer_on_device",
      system_prompt_version: "v2",
    };
    await fetchAndActivate(rc);
    activated = true;
  } catch (e) {
    console.warn("[remote-config] init failed, using defaults");
    rc = null;
  }
}

export function remoteCloudModel(): string {
  if (rc && activated) {
    try {
      const v = getValue(rc, "cloud_model").asString();
      if (v) return v;
    } catch {
      /* fall through */
    }
  }
  return (import.meta.env.VITE_AI_CLOUD_MODEL as string) || "gemini-3.5-flash-lite";
}

export function remoteInferenceMode(): string {
  if (rc && activated) {
    try {
      const v = getValue(rc, "inference_mode").asString();
      if (v) return v;
    } catch {
      /* fall through */
    }
  }
  return (import.meta.env.VITE_AI_INFERENCE_MODE as string) || "prefer_on_device";
}