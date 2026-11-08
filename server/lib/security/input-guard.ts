export function sanitizeText(input: string): string {
  return input.replace(/[\u0000-\u001f]/g, "").trim();
}
export function detectInjection(text: string): boolean {
  const patterns = [/ignore (all|previous) instructions/i, /system prompt/i, /you are now/i];
  return patterns.some((p) => p.test(text));
}
