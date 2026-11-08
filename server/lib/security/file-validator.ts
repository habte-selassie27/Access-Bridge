const ALLOWED_MIMES = ["image/jpeg", "image/png", "application/pdf"];
export function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIMES.includes(mime);
}
export function isWithinSize(sizeBytes: number, maxBytes: number): boolean {
  return sizeBytes <= maxBytes;
}
