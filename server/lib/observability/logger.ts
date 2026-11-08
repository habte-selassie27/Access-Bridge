export function log(level: "info" | "warn" | "error", msg: string, meta?: Record<string, unknown>): void {
  const entry = { ts: new Date().toISOString(), level, msg, ...meta };
  if (level === "error") console.error(JSON.stringify(entry));
  else if (level === "warn") console.warn(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}
