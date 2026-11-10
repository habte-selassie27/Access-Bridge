// Adaption API client — server-only.
//
// Endpoints per https://docs.adaptionlabs.ai/api :
//   POST /api/v1/datasets/upload/initiate   presigned upload URL
//   POST /api/v1/datasets/upload/complete   register the uploaded rows
//   POST /api/v1/datasets/{id}/adapt        column mapping + optional translate/localize
//   POST /api/v1/datasets/{id}/translate    add translated rows
//   POST /api/v1/datasets/{id}/localize     add country/localized rows
//   GET  /api/v1/datasets/{id}/status       poll until succeeded / failed
//   GET  /api/v1/datasets/{id}/download     processed rows
//   GET  /api/v1/datasets/{id}/evaluation   Adaption's own quality report
//
// The API key never leaves the server: nothing here is imported by frontend code.

const DEFAULT_BASE_URL = "https://api.prod.adaptionlabs.ai";

export class AdaptionError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_CONFIGURED" | "UPSTREAM" | "TIMEOUT" | "BAD_RESPONSE",
    readonly status?: number
  ) {
    super(message);
    this.name = "AdaptionError";
  }
}

export interface AdaptionDatasetStatus {
  dataset_id: string;
  status: "pending" | "running" | "awaiting_input" | "awaiting_column_selection" | "succeeded" | "failed" | string;
  row_count?: number;
  progress?: { percent: number; processed_rows: number; total_rows: number } | null;
  error_data?: unknown;
}

export interface AdaptionRun {
  runId: string | null;
  estimatedMinutes: number;
  estimatedCredits: number;
}

export interface ChatRow {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
}

export class AdaptionClient {
  private readonly baseUrl: string;

  constructor(
    private readonly apiKey: string,
    baseUrl = process.env.ADAPTION_BASE_URL || DEFAULT_BASE_URL
  ) {
    if (!apiKey) {
      throw new AdaptionError("ADAPTION_API_KEY is not set.", "NOT_CONFIGURED");
    }
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  static fromEnv(): AdaptionClient | null {
    const key = process.env.ADAPTION_API_KEY || "";
    return key ? new AdaptionClient(key) : null;
  }

  private async request<T>(path: string, init: RequestInit = {}, timeoutMs = 90_000): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...(init.headers || {}),
        },
      });
      const text = await res.text();
      if (!res.ok) {
        const detail = text.slice(0, 300);
        throw new AdaptionError(`Adaption ${path} failed (${res.status}): ${detail}`, "UPSTREAM", res.status);
      }
      try {
        return (text ? JSON.parse(text) : {}) as T;
      } catch {
        throw new AdaptionError(`Adaption ${path} returned non-JSON: ${text.slice(0, 200)}`, "BAD_RESPONSE", res.status);
      }
    } catch (err) {
      if (err instanceof AdaptionError) throw err;
      if ((err as Error).name === "AbortError") {
        throw new AdaptionError(`Adaption ${path} timed out after ${timeoutMs}ms`, "TIMEOUT");
      }
      throw new AdaptionError(`Adaption ${path} network error: ${(err as Error).message}`, "UPSTREAM");
    } finally {
      clearTimeout(timer);
    }
  }

  /** Upload rows as JSONL and register them as a dataset. Returns the dataset id. */
  async uploadRows(rows: ChatRow[], name: string): Promise<string> {
    const body = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
    const bytes = Buffer.byteLength(body, "utf8");

    const initiated = await this.request<{ upload_url: string }>("/api/v1/datasets/upload/initiate", {
      method: "POST",
      body: JSON.stringify({ name, file_format: "jsonl" }),
    });
    if (!initiated.upload_url) {
      throw new AdaptionError("Adaption upload/initiate returned no upload_url", "BAD_RESPONSE");
    }

    // The presigned PUT goes straight to S3 and must not carry our Authorization header.
    const putRes = await fetch(initiated.upload_url, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body,
    });
    if (!putRes.ok) {
      throw new AdaptionError(`Upload to storage failed (${putRes.status})`, "UPSTREAM", putRes.status);
    }

    // /upload/complete wants the object key; it is the path of the presigned URL.
    const s3Key = decodeURIComponent(new URL(initiated.upload_url).pathname.replace(/^\//, ""));
    const completed = await this.request<{ dataset_id: string; status?: string }>("/api/v1/datasets/upload/complete", {
      method: "POST",
      body: JSON.stringify({ s3_key: s3Key, name, file_format: "jsonl", file_size_bytes: bytes }),
    });
    if (!completed.dataset_id) {
      throw new AdaptionError("Adaption upload/complete returned no dataset_id", "BAD_RESPONSE");
    }
    return completed.dataset_id;
  }

  /**
   * Start an adaptation run. Passing `translateLanguages` makes the same run emit
   * translated copies of every row (ISO 639-1 codes: am, om, ti, ...).
   */
  async adapt(
    datasetId: string,
    opts: {
      chatColumn?: string;
      translateLanguages?: string[];
      sampleRate?: number;
      idempotencyKey?: string;
      estimate?: boolean;
    } = {}
  ): Promise<AdaptionRun> {
    const payload: Record<string, unknown> = {};
    if (opts.chatColumn) payload.column_mapping = { chat: opts.chatColumn };
    if (opts.translateLanguages?.length) {
      payload.translate = { languages: opts.translateLanguages, sample_rate: opts.sampleRate ?? 1 };
    }
    if (opts.idempotencyKey) payload.job_specification = { idempotency_key: opts.idempotencyKey };
    if (opts.estimate) payload.estimate = true;

    const res = await this.request<{
      run_id: string | null;
      estimatedMinutes: number;
      estimatedCreditsConsumed: number;
      estimate: boolean;
    }>(`/api/v1/datasets/${datasetId}/adapt`, { method: "POST", body: JSON.stringify(payload) });

    return {
      runId: res.run_id ?? null,
      estimatedMinutes: res.estimatedMinutes ?? 0,
      estimatedCredits: res.estimatedCreditsConsumed ?? 0,
    };
  }

  /** Add translated rows to an already-adapted dataset. */
  async translate(datasetId: string, languages: string[], sampleRate = 1): Promise<{ datasetId: string | null; status: string }> {
    const res = await this.request<{ dataset_id: string | null; status: string }>(
      `/api/v1/datasets/${datasetId}/translate`,
      { method: "POST", body: JSON.stringify({ languages, sample_rate: sampleRate }) }
    );
    return { datasetId: res.dataset_id ?? null, status: res.status };
  }

  async status(datasetId: string): Promise<AdaptionDatasetStatus> {
    return this.request<AdaptionDatasetStatus>(`/api/v1/datasets/${datasetId}/status`);
  }

  /** Poll until the dataset reaches a terminal state. Throws on failure or timeout. */
  async waitUntilReady(
    datasetId: string,
    opts: { timeoutMs?: number; intervalMs?: number; onPoll?: (s: AdaptionDatasetStatus) => void } = {}
  ): Promise<AdaptionDatasetStatus> {
    const timeoutMs = opts.timeoutMs ?? 30 * 60 * 1000;
    const intervalMs = opts.intervalMs ?? 10_000;
    const deadline = Date.now() + timeoutMs;
    let last: AdaptionDatasetStatus | null = null;

    while (Date.now() < deadline) {
      last = await this.status(datasetId);
      opts.onPoll?.(last);
      if (last.status === "succeeded") return last;
      if (last.status === "failed") {
        throw new AdaptionError(
          `Adaption dataset ${datasetId} failed: ${JSON.stringify(last.error_data ?? {})}`,
          "UPSTREAM"
        );
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new AdaptionError(
      `Timed out waiting for dataset ${datasetId} (last status: ${last?.status ?? "unknown"})`,
      "TIMEOUT"
    );
  }

  async download(datasetId: string): Promise<Record<string, unknown>[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/datasets/${datasetId}/download?fileFormat=jsonl`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new AdaptionError(`Adaption download failed (${res.status})`, "UPSTREAM", res.status);
      }
      const text = await res.text();
      return text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line) as Record<string, unknown>;
          } catch {
            return null;
          }
        })
        .filter((r): r is Record<string, unknown> => r !== null);
    } finally {
      clearTimeout(timer);
    }
  }

  async evaluation(datasetId: string): Promise<Record<string, unknown> | null> {
    try {
      return await this.request<Record<string, unknown>>(`/api/v1/datasets/${datasetId}/evaluation`);
    } catch (err) {
      if (err instanceof AdaptionError && err.status === 404) return null;
      throw err;
    }
  }
}
