export class AppError extends Error {
  constructor(public code: string, message: string, public status: number = 400) {
    super(message);
    this.name = "AppError";
  }
}
export const ERR = {
  INVALID_INPUT: "INVALID_INPUT",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  UNSUPPORTED_MIME: "UNSUPPORTED_MIME",
  RATE_LIMITED: "RATE_LIMITED",
  SPEND_CAP: "SPEND_CAP",
  UPSTREAM: "UPSTREAM",
  TIMEOUT: "TIMEOUT",
  SCHEMA: "SCHEMA",
} as const;
