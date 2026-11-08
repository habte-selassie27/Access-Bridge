export class GroqVisionOCRAdapter {
  constructor(private apiKey: string, private model: string = "openai/gpt-oss-120b") {}
  async extractText(fileBase64: string, mime: string): Promise<string> {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mime};base64,${fileBase64}` } },
              { type: "text", text: "Extract all readable text from this document image. Return plain text only, preserving line breaks. Do not add commentary." },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Groq OCR ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json: any = await res.json();
    return json.choices?.[0]?.message?.content || "";
  }
}
