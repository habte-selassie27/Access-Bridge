/**
 * Privacy modes for hybrid inference.
 *
 * Mirrors the spec in AGENTS.md §7:
 *   private  → ONLY_ON_DEVICE  (no document bytes leave the device)
 *   smart    → PREFER_ON_DEVICE (cloud fallback only after explicit consent)
 *   cloud    → ONLY_IN_CLOUD    (document sent to Firebase cloud after consent)
 */
export type PrivacyMode = "private" | "smart" | "cloud";

export type SDKMode = "ONLY_ON_DEVICE" | "PREFER_ON_DEVICE" | "ONLY_IN_CLOUD";

/** Real runtime capability state (UI.md §3.2, AGENTS.md §12). */
export type CapabilityState = "checking" | "ready" | "unavailable" | "error";

export const PRIVACY_MODES: readonly PrivacyMode[] = ["private", "smart", "cloud"] as const;

export const PRIVACY_LABELS: Record<PrivacyMode, string> = {
  private: "Private device only",
  smart: "Smart hybrid",
  cloud: "Cloud for complex documents",
};

export const PRIVACY_DESCRIPTIONS: Record<PrivacyMode, string> = {
  private:
    "Nothing leaves this device. If the on-device model cannot run, the request fails instead of uploading your document.",
  smart:
    "Try the on-device model first. Fall back to the cloud only after you have consented to sending document content.",
  cloud:
    "Send the document to Firebase cloud Gemini. Requires your consent before the first transfer.",
};

/** Map a privacy mode to the Firebase SDK InferenceMode name used by hybrid/ai.ts. */
export function toSDKMode(mode: PrivacyMode, consented: boolean): SDKMode {
  switch (mode) {
    case "private":
      return "ONLY_ON_DEVICE";
    case "cloud":
      return "ONLY_IN_CLOUD";
    case "smart":
    default:
      // Without consent, never allow a cloud fallback.
      return consented ? "PREFER_ON_DEVICE" : "ONLY_ON_DEVICE";
  }
}

/** Does this mode require network transfer of document content? */
export function requiresNetwork(mode: PrivacyMode, consented: boolean): boolean {
  const sdk = toSDKMode(mode, consented);
  return sdk === "PREFER_ON_DEVICE" || sdk === "ONLY_IN_CLOUD";
}

/** Does this mode require explicit user consent before running? */
export function requiresConsent(mode: PrivacyMode): boolean {
  return mode === "smart" || mode === "cloud";
}

export interface RoutePlan {
  sdkMode: SDKMode;
  /** Whether the request may proceed at all. */
  allowed: boolean;
  /** Non-sensitive reason code for telemetry. */
  reason:
    | "private_local"
    | "smart_local_no_consent"
    | "smart_hybrid_consented"
    | "cloud_consented"
    | "cloud_consent_required"
    | "private_unsupported_device"
    | "cloud_offline";
}

/**
 * Deterministic policy engine (AGENTS.md §8). Decides the SDK mode and whether
 * the request may proceed, before any network transfer. The Firebase SDK makes
 * the final execution choice; this only gates privacy.
 */
export function planRoute(opts: {
  mode: PrivacyMode;
  consented: boolean;
  deviceAvailable: boolean;
  online: boolean;
}): RoutePlan {
  const { mode, consented, deviceAvailable, online } = opts;
  if (mode === "private") {
    return {
      sdkMode: "ONLY_ON_DEVICE",
      allowed: deviceAvailable,
      reason: deviceAvailable ? "private_local" : "private_unsupported_device",
    };
  }
  if (mode === "cloud") {
    if (!consented) return { sdkMode: "ONLY_IN_CLOUD", allowed: false, reason: "cloud_consent_required" };
    return { sdkMode: "ONLY_IN_CLOUD", allowed: online, reason: online ? "cloud_consented" : "cloud_offline" };
  }
  // smart
  if (!consented) {
    return { sdkMode: "ONLY_ON_DEVICE", allowed: deviceAvailable, reason: deviceAvailable ? "smart_local_no_consent" : "private_unsupported_device" };
  }
  return { sdkMode: "PREFER_ON_DEVICE", allowed: true, reason: "smart_hybrid_consented" };
}

/** Map SDK mode string to the env-style InferenceModeName used by hybrid/ai.ts. */
export function sdkModeToInferenceModeName(sdk: "ONLY_ON_DEVICE" | "PREFER_ON_DEVICE" | "ONLY_IN_CLOUD" | "PREFER_IN_CLOUD"): "only_on_device" | "prefer_on_device" | "only_in_cloud" | "prefer_in_cloud" {
  switch (sdk) {
    case "ONLY_ON_DEVICE":
      return "only_on_device";
    case "PREFER_ON_DEVICE":
      return "prefer_on_device";
    case "ONLY_IN_CLOUD":
      return "only_in_cloud";
    case "PREFER_IN_CLOUD":
      return "prefer_in_cloud";
  }
}