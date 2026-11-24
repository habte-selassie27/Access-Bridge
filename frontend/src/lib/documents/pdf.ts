/**
 * Local PDF text extraction (lazy-loaded, WP-023/062).
 *
 * Dynamically imports a PDF parsing library so the main bundle stays small.
 * Only images/PDFs need it; text/plain goes through a File read. Returns
 * extracted text, or "" on failure. Never treats the extraction as ground
 * truth — it feeds the verifier, which re-finds dates/amounts in the source.
 */

let parser: any = null;

export async function getParser(): Promise<any> {
  if (!parser) {
    // Dynamic import: keeps pdf.js out of the main bundle.
    const mod = await import("pdfjs-dist/legacy/build/pdf.mjs");
    parser = mod;
  }
  return parser;
}

export async function extractPdfText(file: File): Promise<string> {
  const mod = await getParser();
  const buf = await file.arrayBuffer();
  const task = mod.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, useSystemFonts: true });
  const pdf = await task;
  const chunks: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    chunks.push(tc.items.map((i: any) => i.str).join(" "));
  }
  return chunks.join("\n\n");
}