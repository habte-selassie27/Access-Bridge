export class GeminiOCRAdapter {
  constructor(private apiKey: string) {}
  async extractText(fileBase64: string, mime: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: mime, data: fileBase64 } },
              { text: "Extract all readable text from this document image. Return plain text only, preserving line breaks. Do not add commentary." },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Gemini OCR ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json: any = await res.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
}
