export function sanitizeText(input: string): string {
  // Control characters are removed, but the line breaks are kept: deleting a
  // newline would join two lines of the document into one, and the verifier
  // would then look for a phrase across that join. The same text is used for
  // the model and for the verification, so they stay in step.
  return input.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ").trim();
}
export function detectInjection(text: string): boolean {
  const patterns = [/ignore (all|previous) instructions/i, /system prompt/i, /you are now/i];
  return patterns.some((p) => p.test(text));
}
