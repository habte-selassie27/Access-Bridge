export class GroqAdapter {
  constructor(private apiKey: string, private model: string = "openai/gpt-oss-120b") {}
  async complete(system: string, user: string, maxTokens: number = 1000): Promise<string> {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Groq ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json: any = await res.json();
    return json.choices?.[0]?.message?.content || "";
  }
}
